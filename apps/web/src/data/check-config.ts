export type DoctorCheckValue = number | string | boolean | null;

export type DoctorIssueLike = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: string;
};

export type DoctorCheckDefinition = {
  message: string;
  brief: string;
  formatDetails: (value: DoctorCheckValue) => string;
};

const CHECK_DEFINITIONS: Record<string, DoctorCheckDefinition> = {
  DB_LATENCY: {
    message: "DB响应时间",
    brief: "数据库高延迟",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}ms` : String(value ?? "-"),
  },
  DB_CONNECTIONS: {
    message: "DB连接数",
    brief: "数据库连接数过高",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}` : String(value ?? "-"),
  },
  DB_SIZE: {
    message: "DB大小",
    brief: "数据库空间异常",
    formatDetails: (value) =>
      typeof value === "number"
        ? `${(value / (1024 * 1024)).toFixed(2)} MB`
        : String(value ?? "-"),
  },
  REDIS_CONNECTION: {
    message: "Redis连接",
    brief: "Redis连接失败",
    formatDetails: (value) =>
      typeof value === "boolean" ? (value ? "连接正常" : "连接失败") : "-",
  },
  REDIS_LATENCY: {
    message: "Redis响应时间",
    brief: "Redis高延迟",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}ms` : String(value ?? "-"),
  },
  REDIS_MEMORY: {
    message: "Redis内存",
    brief: "Redis内存占用过高",
    formatDetails: (value) =>
      typeof value === "number"
        ? `${(value / (1024 * 1024)).toFixed(2)} MB`
        : "获取失败",
  },
  REDIS_FRAGMENTATION: {
    message: "Redis碎片率",
    brief: "Redis碎片率过高",
    formatDetails: (value) =>
      typeof value === "number" ? value.toFixed(2) : String(value ?? "-"),
  },
  REDIS_KEYS: {
    message: "Redis键数",
    brief: "Redis键数量异常",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}` : String(value ?? "-"),
  },
};

const FALLBACK_DEFINITION: DoctorCheckDefinition = {
  message: "未知检查项",
  brief: "检查项异常",
  formatDetails: (value) => String(value ?? "-"),
};

export function getDoctorCheckDefinition(code: string): DoctorCheckDefinition {
  return (
    CHECK_DEFINITIONS[code] ?? {
      ...FALLBACK_DEFINITION,
      message: code,
      brief: `${code}异常`,
    }
  );
}

export function getDoctorCheckMessage(code: string): string {
  return getDoctorCheckDefinition(code).message;
}

export function formatDoctorCheckDetails(
  code: string,
  value: DoctorCheckValue,
): string {
  return getDoctorCheckDefinition(code).formatDetails(value);
}

export function buildDoctorBriefFromIssues(issues: DoctorIssueLike[]): string {
  const errorIssues = issues.filter((item) => item.severity === "error");
  if (errorIssues.length === 0) return "";

  return errorIssues
    .map((item) => {
      const brief = getDoctorCheckDefinition(item.code).brief;
      return item.details ? `${brief}：${item.details}` : brief;
    })
    .join("，");
}
