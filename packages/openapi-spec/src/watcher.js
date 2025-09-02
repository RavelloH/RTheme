import chokidar from "chokidar";
import { spawn } from "child_process";
import { join } from "path";

console.log("启动 OpenAPI 文件监控器...");

// 监控 OpenAPI 文件
const watcher = chokidar.watch(["openapi.json", "openapi.yaml"], {
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  persistent: true,
  ignoreInitial: true, // 启动时不触发
});

let isProcessing = false;

async function regenerateAPIDocs() {
  if (isProcessing) {
    console.log("⏳ API文档生成进行中，跳过此次触发");
    return;
  }

  isProcessing = true;
  console.log("🔄 检测到 OpenAPI 文件变化，正在重新生成 API 文档...");

  try {
    // 先清理旧的API文档
    console.log("🧹 清理旧的 API 文档...");
    await runCommand("pnpm", ["--filter", "docs", "clean-api-docs"]);

    // 重新生成API文档
    console.log("📚 生成新的 API 文档...");
    await runCommand("pnpm", ["--filter", "docs", "gen-api-docs", "api"]);

    console.log("✅ API 文档已成功更新!");
  } catch (error) {
    console.error("❌ API 文档生成失败:", error);
  } finally {
    isProcessing = false;
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      cwd: join(process.cwd(), "../.."),
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
    regenerateAPIDocs();
  })
  .on("add", (path) => {
    console.log(`➕ 检测到新文件: ${path}`);
    regenerateAPIDocs();
  })
  .on("unlink", (path) => {
    console.log(`🗑️ 检测到文件删除: ${path}`);
    regenerateAPIDocs();
  })
  .on("error", (error) => {
    console.error("❌ 文件监控错误:", error);
  })
  .on("ready", () => {
    console.log(
      "👀 OpenAPI 文件监控已启动，监控文件: openapi.json, openapi.yaml",
    );
  });

// 处理进程退出
const cleanup = () => {
  console.log("\n🔄 正在停止文件监控...");
  watcher.close();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
