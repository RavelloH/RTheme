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
  formatDetails: (value: DoctorCheckValue) => string | undefined;
};

const CHECK_DEFINITIONS: Record<string, DoctorCheckDefinition> = {
  DB_LATENCY: {
    message: "DB响应时间",
    brief: "数据库高延迟",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}ms` : undefined,
  },
  DB_CONNECTIONS: {
    message: "DB连接数",
    brief: "数据库连接数过高",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}` : undefined,
  },
  DB_SIZE: {
    message: "DB大小",
    brief: "数据库空间异常",
    formatDetails: (value) =>
      typeof value === "number"
        ? `${(value / (1024 * 1024)).toFixed(2)} MB`
        : undefined,
  },
  REDIS_CONNECTION: {
    message: "Redis连接",
    brief: "Redis连接失败",
    formatDetails: (value) =>
      typeof value === "boolean" && value ? "连接正常" : undefined,
  },
  REDIS_LATENCY: {
    message: "Redis响应时间",
    brief: "Redis高延迟",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}ms` : undefined,
  },
  REDIS_MEMORY: {
    message: "Redis内存",
    brief: "Redis内存占用过高",
    formatDetails: (value) =>
      typeof value === "number"
        ? `${(value / (1024 * 1024)).toFixed(2)} MB`
        : undefined,
  },
  REDIS_FRAGMENTATION: {
    message: "Redis碎片率",
    brief: "Redis碎片率过高",
    formatDetails: (value) =>
      typeof value === "number" ? value.toFixed(2) : undefined,
  },
  REDIS_KEYS: {
    message: "Redis键数",
    brief: "Redis键数量异常",
    formatDetails: (value) =>
      typeof value === "number" ? `${value}` : undefined,
  },
};

const FALLBACK_DEFINITION: DoctorCheckDefinition = {
  message: "未知检查项",
  brief: "检查项异常",
  formatDetails: (value) => (value === null ? undefined : String(value)),
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
): string | undefined {
  return getDoctorCheckDefinition(code).formatDetails(value);
}

function shouldAppendBriefDetails(brief: string, details?: string): boolean {
  if (!details) return false;
  const normalizedDetails = details.trim();
  if (!normalizedDetails || normalizedDetails === "-") return false;
  return !brief.includes(normalizedDetails);
}

export function buildDoctorBriefFromIssues(issues: DoctorIssueLike[]): string {
  const errorIssues = issues.filter((item) => item.severity === "error");
  if (errorIssues.length === 0) return "";

  return errorIssues
    .map((item) => {
      const brief = getDoctorCheckDefinition(item.code).brief;
      if (!shouldAppendBriefDetails(brief, item.details)) {
        return brief;
      }
      return `${brief}：${item.details!.trim()}`;
    })
    .join("，");
}
