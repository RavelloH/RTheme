import chokidar, { type FSWatcher } from "chokidar";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import { createRequire } from "module";

// 使用 require 来导入 CommonJS 模块
const require = createRequire(import.meta.url);
const { default: RlogClass } = require("rlog-js");
const rlog = new RlogClass();

class DevWatcher {
  private tscProcess: ChildProcess | null = null;
  private apiWatcher: FSWatcher | null = null;
  private sharedTypesWatcher: FSWatcher | null = null;
  private isGenerating = false;
  private generationQueue: (() => void)[] = [];

  constructor() {
    this.startTypeScriptWatcher();
    this.startApiWatcher();
    this.startSharedTypesWatcher();
    this.handleProcessExit();
  }

  private startTypeScriptWatcher() {
    rlog.info("启动 TypeScript 编译监控...");
    this.tscProcess = spawn("tsc", ["--watch"], {
      stdio: ["ignore", "ignore", "pipe"], // 忽略 stdout，只显示 stderr 错误
      shell: true,
    });

    this.tscProcess.stderr?.on("data", (data) => {
      const output = data.toString();
      // 只显示错误信息，过滤掉编译成功的消息
      if (output.includes("error") || output.includes("Error")) {
        process.stderr.write(output);
      }
    });

    this.tscProcess.on("error", (error) => {
      rlog.error(`TypeScript 监控进程错误: ${error}`);
    });
  }

  private startApiWatcher() {
    // 监控 API 路由文件
    const apiDir = join(process.cwd(), "../../apps/web/src/app/api");

    rlog.info(`启动 API 文件监控...`);
    rlog.info(`工作目录: ${process.cwd()}`);
    rlog.info(`监控API目录: ${apiDir}`);

    // 直接监控整个API目录，过滤route.ts和route.js文件
    this.apiWatcher = chokidar.watch(apiDir, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: false, // 启动时显示现有文件
      depth: 10, // 递归深度
    });

    this.apiWatcher
      .on("ready", () => {
        rlog.success("API 文件监控已启动");
      })
      .on("change", (path: string) => {
        if (path.endsWith("route.ts") || path.endsWith("route.js")) {
          rlog.info(`检测到 API 文件变化: ${path}`);
          this.queueGeneration();
        }
      })
      .on("add", (path: string) => {
        if (path.endsWith("route.ts") || path.endsWith("route.js")) {
          this.queueGeneration();
        }
      })
      .on("unlink", (path: string) => {
        if (path.endsWith("route.ts") || path.endsWith("route.js")) {
          rlog.info(`检测到 API 文件删除: ${path}`);
          this.queueGeneration();
        }
      })
      .on("error", (error: unknown) => {
        rlog.error(`API 文件监控错误: ${error}`);
      });
  }

  private startSharedTypesWatcher() {
    // 监控 shared-types 源文件
    const sharedTypesDir = join(process.cwd(), "../shared-types/src/api");
    const sharedTypesPattern = join(sharedTypesDir, "**/*.ts");

    rlog.info(`启动 shared-types API 文件监控...`);
    rlog.info(`工作目录: ${process.cwd()}`);
    rlog.info(`shared-types目录: ${sharedTypesDir}`);
    rlog.info(`监控模式: ${sharedTypesPattern}`);

    // 直接监控目录而不是使用复杂的glob模式
    this.sharedTypesWatcher = chokidar.watch(sharedTypesDir, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: false, // 启动时显示现有文件
      depth: 10, // 递归深度
    });

    this.sharedTypesWatcher
      .on("ready", () => {
        rlog.success("shared-types API 文件监控已启动");
      })
      .on("change", (path: string) => {
        if (path.endsWith(".ts")) {
          rlog.info(`检测到 shared-types API 文件变化: ${path}`);
          this.queueGeneration();
        }
      })
      .on("add", (path: string) => {
        if (path.endsWith(".ts")) {
          this.queueGeneration();
        }
      })
      .on("unlink", (path: string) => {
        if (path.endsWith(".ts")) {
          rlog.info(`检测到 shared-types API 文件删除: ${path}`);
          this.queueGeneration();
        }
      })
      .on("error", (error: unknown) => {
        rlog.error(`shared-types API 文件监控错误: ${error}`);
      });
  }

  private queueGeneration() {
    // 使用队列机制，确保同时只有一个生成任务
    this.generationQueue.push(() => this.regenerateOpenAPI());
    this.processQueue();
  }

  private async processQueue() {
    if (this.isGenerating || this.generationQueue.length === 0) {
      return;
    }

    this.isGenerating = true;

    // 延迟执行，给 TypeScript 编译时间
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 清空队列，只执行最新的生成请求
    this.generationQueue.length = 0;

    try {
      await this.regenerateOpenAPI();
    } catch (error) {
      // 在开发模式下，即使生成失败也不应该崩溃整个监控系统
      rlog.error(`OpenAPI 生成失败，但监控将继续运行: ${error}`);
    } finally {
      this.isGenerating = false;
      // 检查队列中是否有新任务
      if (this.generationQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  private async regenerateOpenAPI() {
    rlog.info("正在重新生成 OpenAPI 规范...");

    return new Promise<void>((resolve) => {
      // 使用子进程来生成 OpenAPI，完全避免模块缓存问题
      const child = spawn("tsx", ["src/cli.ts"], {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
      });

      child.on("close", (code) => {
        if (code === 0) {
          rlog.success("OpenAPI 规范已更新");
          resolve();
        } else {
          rlog.error(`OpenAPI 生成失败，退出代码: ${code}，但监控将继续运行`);
          // 不再抛出异常，而是直接 resolve，让监控继续运行
          resolve();
        }
      });

      child.on("error", (error) => {
        rlog.error(`OpenAPI 生成进程错误: ${error}，但监控将继续运行`);
        // 不再抛出异常，而是直接 resolve，让监控继续运行
        resolve();
      });
    });
  }

  private handleProcessExit() {
    const cleanup = () => {
      rlog.info("正在清理资源...");

      if (this.tscProcess) {
        this.tscProcess.kill();
      }

      if (this.apiWatcher) {
        this.apiWatcher.close();
      }

      if (this.sharedTypesWatcher) {
        this.sharedTypesWatcher.close();
      }

      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
  }
}

// 启动开发监控器
rlog.info("启动 OpenAPI Generator 开发模式...");
new DevWatcher();
