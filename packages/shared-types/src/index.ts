// API Schema 导出
export * from "./api/common.js";
export * from "./api/auth.js";
export * from "./api/audit.js";
export * from "./api/captcha.js";
export * from "./api/doctor.js";
export * from "./api/error.js";
export * from "./api/setting.js";
export * from "./api/stats.js";
export * from "./api/user.js";
export * from "./api/post.js";
export * from "./api/tag.js";
export * from "./api/category.js";

// 类型安全的 API 客户端工具
export { createApiClient } from "./client.js";
