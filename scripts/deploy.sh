#!/usr/bin/env bash
set -euo pipefail

SOURCE_OWNER="${NP_BOOT_SOURCE_OWNER:-RavelloH}"
SOURCE_PROJECT="${NP_BOOT_SOURCE_PROJECT:-NeutralPress}"
SOURCE_REVISION="${NP_BOOT_SOURCE_REVISION:-main}"
WORKSPACE_DIR="${NP_BOOT_WORKSPACE:-$PWD/neutralpress}"
IMAGE_OVERRIDE="${NP_BOOT_IMAGE_OVERRIDE:-}"
SHOULD_BOOT=true
ENABLE_ENGINE_BOOTSTRAP=true
NETWORK_ROUTE_MODE="${NP_BOOT_ROUTE_PROFILE:-auto}"
USE_MAINLAND_MIRROR=false
CONTAINER_TOOL=(docker)
ENGINE_BOOTSTRAP_URL="https://linuxmirrors.cn/docker.sh"
REGION_DISCOVERY_ENDPOINT="https://ip.api.ravelloh.top/"

usage() {
  cat <<'EOF'
NeutralPress Docker 一键部署脚本

用法:
  bash deploy.sh [选项]

选项:
  --workspace <path>      工作目录（默认: 当前目录下的 neutralpress）
  --channel <ref>         仓库分支/Tag/提交（默认: main）
  --artifact <image>      指定镜像地址（写入 .env 的 NEUTRALPRESS_IMAGE）
  --route-profile <mode>  网络路由策略：auto|mainland|overseas（默认: auto）
  --skip-engine-setup     禁用容器引擎自动安装（缺失时直接失败）
  --prepare-only          仅下载配置并生成 .env，不执行 docker compose up
  -h, --help        显示帮助
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
    curl -fsSL "$url" -o "$output"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$output" "$url"
    return
  fi
  fail "未找到 curl 或 wget，无法下载文件"
}

fetch_text() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --max-time 5 "$url"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO- --timeout=5 "$url"
    return
  fi
  fail "未找到 curl 或 wget，无法请求网络"
}

escape_sed_replacement() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//&/\\&}"
  value="${value//|/\\|}"
  printf '%s' "$value"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="$(escape_sed_replacement "$value")"
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" .env
  else
    printf '\n%s=%s\n' "$key" "$value" >>.env
  fi
}

read_env() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    printf ''
    return
  fi
  printf '%s' "${line#*=}"
}

pem_to_env_string() {
  local file="$1"
  local encoded
  encoded="$(awk 'BEGIN { ORS=""; } { sub(/\r$/, ""); printf "%s\\\\n", $0 }' "$file")"
  encoded="${encoded%\\n}"
  printf '"%s"' "$encoded"
}

generate_master_secret_if_needed() {
  local current
  current="$(read_env "MASTER_SECRET")"
  if [[ -z "$current" || "$current" == change_me_to_a_random_string_with_at_least_32_chars* ]]; then
    local secret
    secret="$(openssl rand -hex 32)"
    upsert_env "MASTER_SECRET" "$secret"
    log "已自动生成 MASTER_SECRET"
  fi
}

generate_jwt_keys_if_needed() {
  local current_private current_public
  current_private="$(read_env "JWT_PRIVATE_KEY")"
  current_public="$(read_env "JWT_PUBLIC_KEY")"

  if [[ "$current_private" != *PASTE_YOUR_PRIVATE_KEY_HERE* && "$current_public" != *PASTE_YOUR_PUBLIC_KEY_HERE* ]]; then
    return
  fi

  local tmp_dir private_file public_file private_env public_env
  tmp_dir="$(mktemp -d)"
  private_file="${tmp_dir}/jwt-private.pem"
  public_file="${tmp_dir}/jwt-public.pem"

  openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$private_file" >/dev/null 2>&1
  openssl pkey -in "$private_file" -pubout -out "$public_file" >/dev/null 2>&1

  private_env="$(pem_to_env_string "$private_file")"
  public_env="$(pem_to_env_string "$public_file")"

  upsert_env "JWT_PRIVATE_KEY" "$private_env"
  upsert_env "JWT_PUBLIC_KEY" "$public_env"

  rm -rf "$tmp_dir"
  log "已自动生成 JWT_PRIVATE_KEY / JWT_PUBLIC_KEY"
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

      if [[ -n "$country_code" ]]; then
        log "网络环境检测完成：country=${country_code}，USE_MAINLAND_MIRROR=${USE_MAINLAND_MIRROR}"
      else
        log "网络环境检测失败，默认按非中国大陆网络处理"
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
  need_cmd bash
  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    fail "自动安装 Docker 需要 curl 或 wget"
  fi

  resolve_network_route

  local installer
  installer="$(mktemp)"
  download_file "$ENGINE_BOOTSTRAP_URL" "$installer"
  chmod +x "$installer"

  if [[ "$USE_MAINLAND_MIRROR" == "true" ]]; then
    log "开始安装 Docker（国内源）..."
    run_with_privilege bash "$installer" \
      --source mirrors.aliyun.com/docker-ce \
      --source-registry dockerproxy.net \
      --protocol http \
      --install-latest true \
      --close-firewall true
  else
    log "开始安装 Docker（官方源）..."
    run_with_privilege bash "$installer" \
      --source download.docker.com \
      --source-registry registry.hub.docker.com \
      --protocol http \
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
    --channel)
      [[ $# -ge 2 ]] || fail "--channel 需要一个参数"
      SOURCE_REVISION="$2"
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

need_cmd openssl

if [[ "$SHOULD_BOOT" == "true" ]]; then
  bootstrap_container_engine_if_needed
  ensure_container_tool_access
  if ! container_exec compose version >/dev/null 2>&1; then
    fail "当前环境缺少 Docker Compose 插件（命令: docker compose）"
  fi
fi

RAW_BASE_URL="https://raw.githubusercontent.com/${SOURCE_OWNER}/${SOURCE_PROJECT}/${SOURCE_REVISION}"

mkdir -p "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

log "下载部署文件到: $WORKSPACE_DIR"
download_file "${RAW_BASE_URL}/docker-compose.yml" "docker-compose.yml"
download_file "${RAW_BASE_URL}/.env.example" ".env.example"

if [[ ! -f .env ]]; then
  cp .env.example .env
  log "已创建 .env（基于 .env.example）"
fi

generate_master_secret_if_needed
generate_jwt_keys_if_needed

if [[ -n "$IMAGE_OVERRIDE" ]]; then
  upsert_env "NEUTRALPRESS_IMAGE" "$IMAGE_OVERRIDE"
  log "已设置镜像: $IMAGE_OVERRIDE"
fi

if [[ "$SHOULD_BOOT" == "true" ]]; then
  log "开始拉取镜像并启动容器..."
  container_exec compose pull
  container_exec compose up -d
  log "部署完成，默认访问地址: http://localhost:3000"
  log "查看日志: cd $WORKSPACE_DIR && ${CONTAINER_TOOL[*]} compose logs -f web"
else
  log "已完成配置准备（未启动容器）"
  log "启动命令: cd $WORKSPACE_DIR && docker compose up -d"
fi
