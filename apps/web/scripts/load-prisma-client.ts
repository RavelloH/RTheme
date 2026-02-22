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

export async function loadPrismaClientConstructor(): Promise<PrismaClientConstructor> {
  const namespace = (await import(
    "@prisma/client"
  )) as PrismaClientModuleNamespace;
  const PrismaClient =
    namespace.PrismaClient ?? namespace.default?.PrismaClient;

  if (!PrismaClient) {
    throw new Error("无法从 @prisma/client 加载 PrismaClient 构造函数");
  }

  return PrismaClient;
}
