import chokidar, { type FSWatcher } from "chokidar";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import Rlog from "rlog-js";

const rlog = new Rlog();

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
      stdio: "inherit",
      shell: true,
    });

    this.tscProcess.on("error", (error) => {
      rlog.error(`TypeScript 监控进程错误: ${error}`);
    });
  }

  private startApiWatcher() {
    // 监控 API 路由文件
    const apiPath = join(
      process.cwd(),
      "../../apps/web/src/app/api/**/route.{ts,js}"
    );

    rlog.info(`启动 API 文件监控: ${apiPath}`);

    this.apiWatcher = chokidar.watch(apiPath, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true, // 启动时不触发
    });

    this.apiWatcher
      .on("change", (path: string) => {
        rlog.info(`检测到 API 文件变化: ${path}`);
        this.queueGeneration();
      })
      .on("add", (path: string) => {
        rlog.info(`检测到新 API 文件: ${path}`);
        this.queueGeneration();
      })
      .on("unlink", (path: string) => {
        rlog.info(`检测到 API 文件删除: ${path}`);
        this.queueGeneration();
      })
      .on("error", (error: unknown) => {
        rlog.error(`API 文件监控错误: ${error}`);
      });

    rlog.success("API 文件监控已启动");
  }

  private startSharedTypesWatcher() {
    // 监控 shared-types 源文件
    const sharedTypesPath = join(
      process.cwd(),
      "../shared-types/src/api/**/*.ts"
    );

    rlog.info(`启动 shared-types API 文件监控: ${sharedTypesPath}`);

    this.sharedTypesWatcher = chokidar.watch(sharedTypesPath, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true, // 启动时不触发
    });

    this.sharedTypesWatcher
      .on("change", (path: string) => {
        rlog.info(`检测到 shared-types API 文件变化: ${path}`);
        this.queueGeneration();
      })
      .on("add", (path: string) => {
        rlog.info(`检测到新 shared-types API 文件: ${path}`);
        this.queueGeneration();
      })
      .on("unlink", (path: string) => {
        rlog.info(`检测到 shared-types API 文件删除: ${path}`);
        this.queueGeneration();
      })
      .on("error", (error: unknown) => {
        rlog.error(`shared-types API 文件监控错误: ${error}`);
      });

    rlog.success("shared-types API 文件监控已启动");
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
    await new Promise(resolve => setTimeout(resolve, 800));

    // 清空队列，只执行最新的生成请求
    this.generationQueue.length = 0;

    try {
      await this.regenerateOpenAPI();
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

    return new Promise<void>((resolve, reject) => {
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
          rlog.error(`OpenAPI 生成失败，退出代码: ${code}`);
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        rlog.error(`OpenAPI 生成进程错误: ${error}`);
        reject(error);
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