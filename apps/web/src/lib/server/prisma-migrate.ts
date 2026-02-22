import "server-only";

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Logger = (line: string) => void;

function resolveFirstExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolvePrismaCliPath(cwd: string): string {
  const explicitPrismaCliPath = process.env.PRISMA_CLI_PATH;

  const resolveByPnpmStore = (basedir: string): string | null => {
    const pnpmDir = path.resolve(basedir, "node_modules", ".pnpm");
    if (!fs.existsSync(pnpmDir)) {
      return null;
    }

    const entries = fs
      .readdirSync(pnpmDir, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && entry.name.startsWith("prisma@"),
      )
      .map((entry) =>
        path.resolve(
          pnpmDir,
          entry.name,
          "node_modules",
          "prisma",
          "build",
          "index.js",
        ),
      );

    return resolveFirstExistingPath(entries);
  };

  const cliPath = resolveFirstExistingPath(
    [
      explicitPrismaCliPath ?? "",
      path.resolve(cwd, "node_modules", "prisma", "build", "index.js"),
      path.resolve(
        cwd,
        "apps",
        "web",
        "node_modules",
        "prisma",
        "build",
        "index.js",
      ),
      path.resolve(
        cwd,
        "prisma-runtime",
        "node_modules",
        "prisma",
        "build",
        "index.js",
      ),
      resolveByPnpmStore(cwd),
    ].filter((item): item is string => Boolean(item)),
  );

  if (!cliPath) {
    throw new Error(
      "无法找到 Prisma CLI，请确认 runtime 镜像包含 prisma-runtime/node_modules 或 node_modules/prisma",
    );
  }
  return cliPath;
}

function resolvePrismaSchemaPath(cwd: string): string {
  const schemaPath = resolveFirstExistingPath([
    path.resolve(cwd, "apps", "web", "prisma", "schema.prisma"),
    path.resolve(cwd, "prisma", "schema.prisma"),
  ]);
  if (!schemaPath) {
    throw new Error("无法找到 prisma/schema.prisma");
  }
  return schemaPath;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function runPrismaMigrateDeploy(options?: {
  cwd?: string;
  logger?: Logger;
}): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const logger = options?.logger;
  const cliPath = resolvePrismaCliPath(cwd);
  const schemaPath = resolvePrismaSchemaPath(cwd);

  try {
    const stdout = execFileSync(
      process.execPath,
      [cliPath, "migrate", "deploy", "--schema", schemaPath],
      {
        cwd,
        env: {
          ...process.env,
          PRISMA_HIDE_UPDATE_MESSAGE: "1",
        },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (logger) {
      for (const line of splitLines(stdout)) {
        if (
          line.includes("Applied") ||
          line.includes("migration") ||
          line.includes("Database")
        ) {
          logger(line);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && "stdout" in error) {
      const execError = error as Error & {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
      };
      const stdout = execError.stdout?.toString() ?? "";
      const stderr = execError.stderr?.toString() ?? "";
      const details = [...splitLines(stdout), ...splitLines(stderr)].join(
        " | ",
      );
      throw new Error(
        `Prisma migrate deploy failed: ${details || error.message}`,
      );
    }

    throw new Error(
      `Prisma migrate deploy failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
