import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getSystemInfo() Schema
*/
export const GetSystemInfoSchema = z.object({
  access_token: z.string().optional(),
});
export type GetSystemInfo = z.infer<typeof GetSystemInfoSchema>;
registerSchema("GetSystemInfo", GetSystemInfoSchema);

// 系统信息响应 Schema
export const SystemInfoSchema = z.object({
  // 操作系统信息
  os: z.object({
    platform: z.string(), // win32, linux, darwin
    type: z.string(), // Windows_NT, Linux, Darwin
    release: z.string(), // 系统版本号
    arch: z.string(), // x64, arm64
    hostname: z.string(), // 主机名
    uptime: z.number(), // 系统运行时间（秒）
  }),
  // 内存信息
  memory: z.object({
    total: z.number(), // 总内存（字节）
    free: z.number(), // 可用内存（字节）
    used: z.number(), // 已用内存（字节）
    usagePercent: z.number(), // 使用率百分比
  }),
  // CPU 信息
  cpu: z.object({
    model: z.string(), // CPU 型号
    cores: z.number(), // 核心数
    speed: z.number(), // 频率（MHz）
    loadAvg: z.array(z.number()), // 1/5/15分钟负载（Unix）
    // CPU 使用率详情
    usage: z
      .object({
        user: z.number(), // 用户态使用率
        system: z.number(), // 系统态使用率
        idle: z.number(), // 空闲率
        total: z.number(), // 总使用率
      })
      .optional(),
  }),
  // Node.js 进程信息
  process: z.object({
    nodeVersion: z.string(), // Node.js 版本
    pid: z.number(), // 进程 ID
    uptime: z.number(), // 进程运行时间（秒）
    memoryUsage: z.object({
      rss: z.number(), // 常驻内存
      heapTotal: z.number(), // 堆内存总量
      heapUsed: z.number(), // 堆内存使用量
      external: z.number(), // 外部内存
      arrayBuffers: z.number().optional(), // ArrayBuffer 内存
    }),
    // 进程详情
    cpuUsage: z
      .object({
        user: z.number(), // 用户态 CPU 时间（微秒）
        system: z.number(), // 系统态 CPU 时间（微秒）
      })
      .optional(),
    // 资源使用
    resourceUsage: z
      .object({
        userCPUTime: z.number(), // 用户态 CPU 时间（微秒）
        systemCPUTime: z.number(), // 系统态 CPU 时间（微秒）
        maxRSS: z.number(), // 最大常驻内存（KB）
        fsRead: z.number(), // 文件系统读取次数
        fsWrite: z.number(), // 文件系统写入次数
        voluntaryContextSwitches: z.number(), // 自愿上下文切换
        involuntaryContextSwitches: z.number(), // 非自愿上下文切换
      })
      .optional(),
    // 事件循环延迟
    eventLoopLag: z.number().optional(), // 事件循环延迟（毫秒）
    // 事件循环利用率
    eventLoopUtilization: z
      .object({
        idle: z.number(), // 空闲时间（毫秒）
        active: z.number(), // 活跃时间（毫秒）
        utilization: z.number(), // 利用率（0-1之间，越接近1表示越繁忙）
      })
      .optional(),
    // 活跃句柄数
    activeHandles: z.number().optional(), // 活跃句柄数（保持事件循环运行的资源）
  }),
  // 磁盘信息（可选，部分平台可能不支持）
  disk: z
    .object({
      total: z.number(), // 总空间（字节）
      free: z.number(), // 可用空间（字节）
      used: z.number(), // 已用空间（字节）
      usagePercent: z.number(), // 使用率百分比
    })
    .optional(),
  // 网络接口信息
  network: z.array(
    z.object({
      name: z.string(), // 接口名称
      address: z.string(), // IP 地址
      netmask: z.string(), // 子网掩码
      family: z.string(), // IPv4 或 IPv6
      mac: z.string(), // MAC 地址
    }),
  ),
  // 环境变量（安全筛选后的）
  env: z.object({
    nodeEnv: z.string().optional(),
  }),
  // 时间信息
  time: z.object({
    serverTime: z.iso.datetime(), // 服务器当前时间
    timezone: z.string(), // 时区
    timezoneOffset: z.number(), // 时区偏移（分钟）
  }),
  // 收集时间
  collectedAt: z.iso.datetime(),
});

export type SystemInfo = z.infer<typeof SystemInfoSchema>;

export const GetSystemInfoSuccessResponseSchema =
  createSuccessResponseSchema(SystemInfoSchema);
export type GetSystemInfoSuccessResponse = z.infer<
  typeof GetSystemInfoSuccessResponseSchema
>;
registerSchema(
  "GetSystemInfoSuccessResponse",
  GetSystemInfoSuccessResponseSchema,
);
