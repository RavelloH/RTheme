import { createRequire } from "module";

type PrismaClientInstance = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

type PrismaClientConstructor = new (options?: unknown) => PrismaClientInstance;

type PrismaClientModuleNamespace = {
  PrismaClient?: PrismaClientConstructor;
  default?: {
    PrismaClient?: PrismaClientConstructor;
  };
};

const requireModule = createRequire(import.meta.url);
const PRISMA_CLIENT_MODULE_CANDIDATES = [
  ".prisma/client",
  "@prisma/client",
] as const;

export async function loadPrismaClientConstructor(): Promise<PrismaClientConstructor> {
  const errors: string[] = [];

  for (const moduleName of PRISMA_CLIENT_MODULE_CANDIDATES) {
    try {
      const namespace = requireModule(
        moduleName,
      ) as PrismaClientModuleNamespace;
      const PrismaClient =
        namespace.PrismaClient ?? namespace.default?.PrismaClient;

      if (PrismaClient) {
        return PrismaClient;
      }

      errors.push(`"${moduleName}" 已加载但未导出 PrismaClient`);
    } catch (error) {
      errors.push(
        `"${moduleName}" 加载失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    [
      "无法加载 PrismaClient 构造函数。",
      "已尝试以下模块：",
      ...errors.map((message) => `- ${message}`),
    ].join("\n"),
  );
}
