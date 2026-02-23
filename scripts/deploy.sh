#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${NP_BOOT_WORKSPACE:-$PWD/neutralpress}"
IMAGE_OVERRIDE="${NP_BOOT_IMAGE_OVERRIDE:-}"
SHOULD_BOOT=true
ENABLE_ENGINE_BOOTSTRAP=true
NETWORK_ROUTE_MODE="${NP_BOOT_ROUTE_PROFILE:-auto}"
USE_MAINLAND_MIRROR=false
CONTAINER_TOOL=(docker)
FORCE_DOWNLOAD=false
ENGINE_BOOTSTRAP_URL="https://linuxmirrors.cn/docker.sh"
REGION_DISCOVERY_ENDPOINT="https://ip.api.ravelloh.top/"
GATEWAY_URL="https://get.neutralpress.net"
TEMP_FILES=()

echo "███╗   ██╗███████╗██╗   ██╗████████╗██████╗  █████╗ ██╗     ██████╗ ██████╗ ███████╗███████╗███████╗";
echo "████╗  ██║██╔════╝██║   ██║╚══██╔══╝██╔══██╗██╔══██╗██║     ██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝";
echo "██╔██╗ ██║█████╗  ██║   ██║   ██║   ██████╔╝███████║██║     ██████╔╝██████╔╝█████╗  ███████╗███████╗";
echo "██║╚██╗██║██╔══╝  ██║   ██║   ██║   ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██╗██╔══╝  ╚════██║╚════██║";
echo "██║ ╚████║███████╗╚██████╔╝   ██║   ██║  ██║██║  ██║███████╗██║     ██║  ██║███████╗███████║███████║";
echo "╚═╝  ╚═══╝╚══════╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝";
echo "                                                                                                    ";
usage() {
  cat <<'EOF'
NeutralPress Docker 一键部署脚本

用法:
  bash deploy.sh [选项]

选项:
  --workspace <path>      工作目录（默认: 当前目录下的 neutralpress）
  --artifact <image>      指定镜像地址（写入 .env 的 NEUTRALPRESS_IMAGE）
  --route-profile <mode>  网络路由策略：auto|mainland|overseas（默认: auto）
  --force                 覆盖已存在的 docker-compose.yml（覆盖前自动备份）
  --skip-engine-setup     禁用容器引擎自动安装（缺失时直接失败）
  --prepare-only          仅下载配置并生成 .env，不执行 docker compose up
  -h, --help              显示帮助
EOF
}

log() {
  printf '[NeutralPress Deploy] %s\n' "$1"
}

fail() {
  printf '[NeutralPress Deploy] 错误: %s\n' "$1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令: $1"
}

track_temp_file() {
  TEMP_FILES+=("$1")
}

cleanup_temp_files() {
  local temp_file
  for temp_file in "${TEMP_FILES[@]}"; do
    rm -f "$temp_file"
  done
}

container_command_hint() {
  if ! command -v docker >/dev/null 2>&1; then
    printf 'docker'
    return
  fi

  if docker info >/dev/null 2>&1; then
    printf 'docker'
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
    printf 'sudo docker'
    return
  fi

  printf 'docker'
}

trap cleanup_temp_files EXIT

is_linux() {
  [[ "$(uname -s)" == "Linux" ]]
}

run_with_privilege() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
    return
  fi

  fail "当前用户不是 root 且未安装 sudo，无法自动安装 Docker"
}

download_file() {
  local url="$1"
  local output="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL \
      --retry 3 \
      --retry-delay 1 \
      --connect-timeout 10 \
      --max-time 120 \
      "$url" \
      -o "$output"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$output" \
      --tries=3 \
      --waitretry=1 \
      --timeout=10 \
      "$url"
    return
  fi
  fail "未找到 curl 或 wget，无法下载文件"
}

fetch_text() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL \
      --retry 3 \
      --retry-delay 1 \
      --connect-timeout 3 \
      --max-time 5 \
      "$url"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO- \
      --tries=3 \
      --waitretry=1 \
      --timeout=5 \
      "$url"
    return
  fi
  fail "未找到 curl 或 wget，无法请求网络"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local temp_env

  temp_env="$(mktemp)"
  track_temp_file "$temp_env"

  awk -v key="$key" -v value="$value" '
    BEGIN { prefix = key "="; replaced = 0 }
    index($0, prefix) == 1 {
      print prefix value
      replaced = 1
      next
    }
    { print }
    END {
      if (replaced == 0) {
        print ""
        print prefix value
      }
    }
  ' .env >"$temp_env"

  mv "$temp_env" .env
}

resolve_network_route() {
  case "$NETWORK_ROUTE_MODE" in
    auto)
      local api_response country_code
      api_response="$(fetch_text "$REGION_DISCOVERY_ENDPOINT" || true)"
      country_code="$(printf '%s' "$api_response" | sed -n 's/.*"country"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1 | tr '[:lower:]' '[:upper:]')"

      if [[ "$country_code" == "CN" ]]; then
        USE_MAINLAND_MIRROR=true
      else
        USE_MAINLAND_MIRROR=false
      fi
      ;;
    mainland)
      USE_MAINLAND_MIRROR=true
      log "网络环境模式手动指定为中国大陆网络"
      ;;
    overseas)
      USE_MAINLAND_MIRROR=false
      log "网络环境模式手动指定为非中国大陆网络"
      ;;
    *)
      fail "--route-profile 只支持 auto|mainland|overseas"
      ;;
  esac
}

bootstrap_container_engine_if_needed() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "已检测到 Docker 与 Docker Compose，跳过自动安装"
    return
  fi

  if [[ "$ENABLE_ENGINE_BOOTSTRAP" != "true" ]]; then
    fail "未检测到 Docker 或 Docker Compose，且已禁用自动安装"
  fi

  is_linux || fail "自动安装 Docker 仅支持 Linux 环境"
  
  local installer
  installer="$(mktemp)"
  track_temp_file "$installer"
  download_file "$ENGINE_BOOTSTRAP_URL" "$installer"
  chmod +x "$installer"

  if [[ "$USE_MAINLAND_MIRROR" == "true" ]]; then
    log "开始安装 Docker（国内源）..."
    run_with_privilege bash "$installer" \
      --source mirrors.aliyun.com/docker-ce \
      --source-registry dockerproxy.net \
      --protocol https \
      --install-latest true \
      --close-firewall true
  else
    log "开始安装 Docker（官方源）..."
    run_with_privilege bash "$installer" \
      --source download.docker.com \
      --source-registry registry.hub.docker.com \
      --protocol https \
      --install-latest true \
      --close-firewall true
  fi

  rm -f "$installer"

  command -v docker >/dev/null 2>&1 || fail "Docker 自动安装后仍不可用，请手动检查"
}

ensure_container_tool_access() {
  if docker info >/dev/null 2>&1; then
    CONTAINER_TOOL=(docker)
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    CONTAINER_TOOL=(sudo docker)
    log "当前用户无法直接访问 Docker，后续命令将自动使用 sudo"
    return
  fi

  fail "Docker 已安装，但当前用户无法访问 Docker 守护进程（可重试 root 用户或将当前用户加入 docker 组）"
}

container_exec() {
  "${CONTAINER_TOOL[@]}" "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ $# -ge 2 ]] || fail "--workspace 需要一个参数"
      WORKSPACE_DIR="$2"
      shift 2
      ;;
    --artifact)
      [[ $# -ge 2 ]] || fail "--artifact 需要一个参数"
      IMAGE_OVERRIDE="$2"
      shift 2
      ;;
    --route-profile)
      [[ $# -ge 2 ]] || fail "--route-profile 需要一个参数"
      NETWORK_ROUTE_MODE="$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]')"
      shift 2
      ;;
    --force)
      FORCE_DOWNLOAD=true
      shift
      ;;
    --skip-engine-setup)
      ENABLE_ENGINE_BOOTSTRAP=false
      shift
      ;;
    --prepare-only)
      SHOULD_BOOT=false
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      fail "未知参数: $1（可用 --help 查看帮助）"
      ;;
  esac
done

# --- 集中进行前置依赖检查 ---
need_cmd bash
if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
  fail "需要 curl 或 wget 来下载网络文件"
fi

# 统一初始化全局网络环境状态
resolve_network_route

if [[ "$SHOULD_BOOT" == "true" ]]; then
  bootstrap_container_engine_if_needed
  ensure_container_tool_access
  if ! container_exec compose version >/dev/null 2>&1; then
    fail "当前环境缺少 Docker Compose 插件（命令: docker compose）"
  fi
fi

mkdir -p "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

log "从网关下载部署文件到: $WORKSPACE_DIR"
if [[ -f docker-compose.yml ]]; then
  if [[ "$FORCE_DOWNLOAD" == "true" ]]; then
    compose_backup_file="docker-compose.yml.bak.$(date +%Y%m%d%H%M%S)"
    cp "docker-compose.yml" "$compose_backup_file"
    log "检测到已有 docker-compose.yml，已备份到: $compose_backup_file"
    download_file "${GATEWAY_URL}/docker-compose.yml" "docker-compose.yml"
  else
    log "检测到已有 docker-compose.yml，跳过下载（如需覆盖请使用 --force）"
  fi
else
  download_file "${GATEWAY_URL}/docker-compose.yml" "docker-compose.yml"
fi

mkdir -p docker
if [[ "$FORCE_DOWNLOAD" == "true" || ! -f docker/watchtower.Dockerfile ]]; then
  download_file "${GATEWAY_URL}/docker/watchtower.Dockerfile" "docker/watchtower.Dockerfile"
fi
if [[ "$FORCE_DOWNLOAD" == "true" || ! -f docker/watchtower-entrypoint.sh ]]; then
  download_file "${GATEWAY_URL}/docker/watchtower-entrypoint.sh" "docker/watchtower-entrypoint.sh"
fi

if [[ ! -f .env ]]; then
  log "正在从网关生成安全的初始环境变量配置..."
  download_file "${GATEWAY_URL}/env" ".env"
  log "已成功创建 .env 文件"
fi

if [[ -n "$IMAGE_OVERRIDE" ]]; then
  upsert_env "NEUTRALPRESS_IMAGE" "$IMAGE_OVERRIDE"
  log "已设置镜像: $IMAGE_OVERRIDE"
fi

if [[ "$SHOULD_BOOT" == "true" ]]; then
  log "开始拉取镜像并启动容器..."
  container_exec compose pull --ignore-buildable
  container_exec compose up -d --build
  log "部署完成，默认访问地址: http://localhost:3000"
  log "查看日志: cd \"$WORKSPACE_DIR\" && ${CONTAINER_TOOL[*]} compose logs -f web"
  log "停止容器: cd \"$WORKSPACE_DIR\" && ${CONTAINER_TOOL[*]} compose down"
else
  log "已完成配置准备（未启动容器）"
  container_hint="$(container_command_hint)"
  log "启动命令: cd \"$WORKSPACE_DIR\" && $container_hint compose up -d"
fi
