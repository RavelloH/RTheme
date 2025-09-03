import chokidar from "chokidar";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import Rlog from "rlog-js";

const rlog = new Rlog();

class DevWatcher {
  private tscProcess: ChildProcess | null = null;
  private apiWatcher: chokidar.FSWatcher | null = null;
  private sharedTypesWatcher: chokidar.FSWatcher | null = null;
  private isGenerating = false;

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
        this.regenerateOpenAPI();
      })
      .on("add", (path: string) => {
        rlog.info(`检测到新 API 文件: ${path}`);
        this.regenerateOpenAPI();
      })
      .on("unlink", (path: string) => {
        rlog.info(`检测到 API 文件删除: ${path}`);
        this.regenerateOpenAPI();
      })
      .on("error", (error: Error) => {
        rlog.error(`API 文件监控错误: ${error}`);
      });

    rlog.success("API 文件监控已启动");
  }

  private startSharedTypesWatcher() {
    // 监控 shared-types API 文件
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
        this.regenerateOpenAPI();
      })
      .on("add", (path: string) => {
        rlog.info(`检测到新 shared-types API 文件: ${path}`);
        this.regenerateOpenAPI();
      })
      .on("unlink", (path: string) => {
        rlog.info(`检测到 shared-types API 文件删除: ${path}`);
        this.regenerateOpenAPI();
      })
      .on("error", (error: Error) => {
        rlog.error(`shared-types API 文件监控错误: ${error}`);
      });

    rlog.success("shared-types API 文件监控已启动");
  }

  private async regenerateOpenAPI() {
    if (this.isGenerating) {
      rlog.info("OpenAPI 生成进行中，跳过此次触发");
      return;
    }

    this.isGenerating = true;
    rlog.info("正在重新生成 OpenAPI 规范...");

    try {
      // 动态导入并执行生成器
      const { generateOpenAPISpec, saveOpenAPISpec } = await import(
        "./generator.js"
      );
      const spec = generateOpenAPISpec();
      saveOpenAPISpec(
        spec,
        join(process.cwd(), "../openapi-spec/openapi.yaml")
      );

      rlog.success("OpenAPI 规范已更新");
    } catch (error) {
      rlog.error(`OpenAPI 生成失败: ${error}`);
    } finally {
      this.isGenerating = false;
    }
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
