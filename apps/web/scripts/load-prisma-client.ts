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

function extractPrismaClient(
  namespace: PrismaClientModuleNamespace,
): PrismaClientConstructor | null {
  return namespace.PrismaClient ?? namespace.default?.PrismaClient ?? null;
}

export async function loadPrismaClientConstructor(): Promise<PrismaClientConstructor> {
  const errors: string[] = [];

  try {
    const namespace = requireModule(
      ".prisma/client",
    ) as PrismaClientModuleNamespace;
    const PrismaClient = extractPrismaClient(namespace);
    if (PrismaClient) {
      return PrismaClient;
    }
    errors.push('".prisma/client" 已加载但未导出 PrismaClient');
  } catch (error) {
    errors.push(
      `".prisma/client" 加载失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const namespace = requireModule(
      "@prisma/client",
    ) as PrismaClientModuleNamespace;
    const PrismaClient = extractPrismaClient(namespace);
    if (PrismaClient) {
      return PrismaClient;
    }
    errors.push('"@prisma/client" 已加载但未导出 PrismaClient');
  } catch (error) {
    errors.push(
      `"@prisma/client" 加载失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  throw new Error(
    [
      "无法加载 PrismaClient 构造函数。",
      "已尝试以下模块：",
      ...errors.map((message) => `- ${message}`),
    ].join("\n"),
  );
}
