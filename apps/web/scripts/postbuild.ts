import fs from "fs";
import path from "path";
import RLog from "rlog-js";

const rlog = new RLog();
rlog.config.setConfig({
  customColorRules: [
    { reg: "NeutralPress", color: "green" },
    { reg: "Standalone", color: "cyan" },
    { reg: "Standard", color: "blue" },
    { reg: "pnpm start", color: "yellow" },
    { reg: "node .next/standalone/apps/web/server.js", color: "yellow" },
  ],
});

/**
 * 递归计算文件夹大小
 */
function getFolderSize(dirPath: string, ignorePatterns: string[] = []): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const normalizedPath = path.normalize(filePath);
    const shouldIgnore = ignorePatterns.some((pattern) =>
      normalizedPath.endsWith(path.normalize(pattern)),
    );
    if (shouldIgnore) continue;

    const stats = fs.lstatSync(filePath);
    if (stats.isDirectory()) {
      size += getFolderSize(filePath, ignorePatterns);
    } else {
      size += stats.size;
    }
  }
  return size;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function main() {
  rlog.log();
  rlog.log("NeutralPress Post-Build Process...");
  rlog.log();

  const cwd = process.cwd();
  const cacheDir = path.join(cwd, ".cache");
  const buildMetaPath = path.join(cacheDir, "build-meta.json");

  const nextDir = path.join(cwd, ".next");
  const standaloneDir = path.join(nextDir, "standalone");
  const staticDir = path.join(nextDir, "static");
  const publicDir = path.join(cwd, "public");

  // --- 时间统计 ---
  const postBuildStartTime = Date.now();
  let prebuildStartTime = 0;
  let prebuildEndTime = 0;
  if (fs.existsSync(buildMetaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(buildMetaPath, "utf-8"));
      prebuildStartTime = meta.prebuildStartTime || 0;
      prebuildEndTime = meta.prebuildEndTime || 0;
    } catch {
      return;
    }
  }
  const prebuildDuration = (prebuildEndTime - prebuildStartTime) / 1000;
  const buildDuration =
    prebuildEndTime > 0 ? (postBuildStartTime - prebuildEndTime) / 1000 : 0;

  // --- 核心逻辑 ---
  rlog.info("Processing build artifacts...");

  let standaloneSize = 0;
  const isStandalone = fs.existsSync(standaloneDir);

  if (isStandalone) {
    rlog.info("✓ Detected [Standalone] build mode");
    rlog.info("> Integrating static assets into standalone package...");

    try {
      // 1. 复制 public -> .next/standalone/apps/web/public
      const destPublic = path.join(standaloneDir, "apps", "web", "public");
      if (fs.existsSync(publicDir)) {
        fs.mkdirSync(path.dirname(destPublic), { recursive: true });
        fs.cpSync(publicDir, destPublic, { recursive: true });
      }

      // 2. 复制 .next/static -> .next/standalone/apps/web/.next/static
      const destStatic = path.join(
        standaloneDir,
        "apps",
        "web",
        ".next",
        "static",
      );
      if (fs.existsSync(staticDir)) {
        fs.mkdirSync(path.join(standaloneDir, "apps", "web", ".next"), {
          recursive: true,
        });
        fs.cpSync(staticDir, destStatic, { recursive: true });
      }

      rlog.success("✓ Assets copied successfully");

      // 3. 直接计算 standalone 文件夹的总大小
      standaloneSize = getFolderSize(standaloneDir);
    } catch (error) {
      rlog.error("Failed to copy assets to standalone folder");
      console.error(error);
    }
  } else {
    rlog.info("✓ Detected [Standard] build mode");
  }

  const standardSize = getFolderSize(nextDir, [
    path.join(".next", "cache"),
    path.join(".next", "standalone"),
  ]);

  // --- 清理缓存 ---
  if (fs.existsSync(cacheDir)) {
    try {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    } catch {
      return;
    }
  }

  // --- 输出总结 ---
  rlog.log();
  rlog.success("Build Summary:");
  rlog.log("----------------------------------------");
  if (prebuildDuration > 0)
    rlog.log(`Pre-build time : ${prebuildDuration.toFixed(2)}s`);
  if (buildDuration > 0) {
    rlog.log(`Core build time: ${buildDuration.toFixed(2)}s`);
    rlog.log(
      `Total time     : ${(prebuildDuration + buildDuration).toFixed(2)}s`,
    );
  }

  if (isStandalone) {
    rlog.log(`Standard Size  : ${formatBytes(standardSize)}`);
    rlog.log(`Standalone Size: ${formatBytes(standaloneSize)}`);
  } else {
    rlog.log(`Artifact Size  : ${formatBytes(standardSize)}`);
  }
  rlog.log("----------------------------------------");
  rlog.log();

  rlog.success("NeutralPress is ready for production!");

  if (isStandalone) {
    rlog.info("Run standalone server (Self-contained):");
    rlog.log("  node .next/standalone/apps/web/server.js");
    rlog.log("OR run standard server:");
    rlog.log("  pnpm start");
  } else {
    rlog.info("Run standard server:");
    rlog.log("  pnpm start");
  }
  rlog.log();
}

main();
