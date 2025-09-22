import chokidar from "chokidar";
import { spawn } from "child_process";
import { join } from "path";

console.log("启动 OpenAPI 文件监控器...");

// 添加启动延迟，避免与 docs 启动冲突
const startupDelay = 3000; // 3秒延迟
let isStartupPeriod = true;

// 监控 OpenAPI 文件
const watcher = chokidar.watch(["openapi.json", "openapi.yaml"], {
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  persistent: true,
  ignoreInitial: true, // 启动时不触发
});

// 启动结束后启用监控
setTimeout(() => {
  isStartupPeriod = false;
}, startupDelay);

let isProcessing = false;
let pendingRegeneration = null;

// 防抖函数：延迟执行，避免快速连续触发
function debounceRegeneration() {
  // 在启动期间忽略文件变化
  if (isStartupPeriod) {
    console.log("⏳ 启动期间，忽略文件变化");
    return;
  }

  if (pendingRegeneration) {
    clearTimeout(pendingRegeneration);
  }

  pendingRegeneration = setTimeout(() => {
    regenerateAPIDocs();
    pendingRegeneration = null;
  }, 1000); // 1秒延迟
}

async function regenerateAPIDocs() {
  if (isProcessing) {
    console.log("⏳ API文档生成进行中，跳过此次触发");
    return;
  }

  isProcessing = true;
  console.log("🔄 检测到 OpenAPI 文件变化，正在重新生成 API 文档...");

  try {
    // 在开发模式下，为了确保更新，总是先清理再生成
    console.log("🧹 清理旧的 API 文档...");
    await runCommand("pnpm", ["--filter", "docs", "clean-api-docs"]);

    // 短暂延迟确保清理完成并给Docusaurus反应时间
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("📚 重新生成 API 文档...");
    await runCommand("pnpm", ["--filter", "docs", "gen-api-docs", "api"]);

    console.log("✅ API 文档已成功更新!");
  } catch (error) {
    console.error("❌ API 文档生成失败:", error);
  } finally {
    isProcessing = false;
  }
}

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      cwd: join(process.cwd(), "../.."),
      env,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令执行失败，退出代码: ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

watcher
  .on("change", (path) => {
    console.log(`📝 检测到文件变化: ${path}`);
    debounceRegeneration();
  })
  .on("add", (path) => {
    console.log(`➕ 检测到新文件: ${path}`);
    debounceRegeneration();
  })
  .on("unlink", (path) => {
    console.log(`🗑️ 检测到文件删除: ${path}`);
    debounceRegeneration();
  })
  .on("error", (error) => {
    console.error("❌ 文件监控错误:", error);
  })
  .on("ready", () => {
    console.log(
      `👀 OpenAPI 文件监控已启动，${startupDelay / 1000}秒后开始监控文件: openapi.json, openapi.yaml`,
    );
    // 延迟启用文件变化监控
    setTimeout(() => {
      console.log("🔥 OpenAPI 文件监控已启用");
    }, startupDelay);
  });

// 处理进程退出
const cleanup = () => {
  console.log("\n🔄 正在停止文件监控...");

  // 清除待执行的防抖任务
  if (pendingRegeneration) {
    clearTimeout(pendingRegeneration);
    pendingRegeneration = null;
  }

  watcher.close();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
