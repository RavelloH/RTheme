import { z } from "zod";

/**
 * 类型安全的 API 客户端工具函数
 */
export function createApiClient(baseUrl: string = "") {
  async function request<T>(
    url: string,
    options: RequestInit = {},
    schema?: z.ZodType<T>,
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 如果提供了 schema，进行运行时验证
    if (schema) {
      return schema.parse(data);
    }

    return data;
  }

  return {
    get: <T>(url: string, schema?: z.ZodType<T>) =>
      request(url, { method: "GET" }, schema),

    post: <T>(url: string, data?: unknown, schema?: z.ZodType<T>) =>
      request(
        url,
        {
          method: "POST",
          body: data ? JSON.stringify(data) : undefined,
        },
        schema,
      ),

    put: <T>(url: string, data?: unknown, schema?: z.ZodType<T>) =>
      request(
        url,
        {
          method: "PUT",
          body: data ? JSON.stringify(data) : undefined,
        },
        schema,
      ),

    delete: <T>(url: string, schema?: z.ZodType<T>) =>
      request(url, { method: "DELETE" }, schema),
  };
}
