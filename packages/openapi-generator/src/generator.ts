import { z } from "zod";
import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "fs";
import { dirname, join, extname } from "path";
import YAML from "yaml";
import Rlog from "rlog-js";
const rlog = new Rlog();

// 动态导入 shared-types 以避免模块缓存问题
async function getSharedTypesSchemas() {
  // 清除可能的缓存，强制重新加载模块
  const sharedTypesPath = "@repo/shared-types";

  try {
    // 使用动态导入来绕过缓存
    const importPath = `${sharedTypesPath}?t=${Date.now()}`;
    const schemas = await import(sharedTypesPath);
    return schemas;
  } catch (error) {
    rlog.error(`导入 shared-types 失败: ${error}`);
    // 如果动态导入失败，尝试传统导入
    const schemas = await import("@repo/shared-types");
    return schemas;
  }
}

// 扫描API文件中的OpenAPI注释
function scanApiFiles(apiDir: string): Record<string, any> {
  const paths: Record<string, any> = {};

  try {
    const scanDirectory = (dir: string) => {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item === "route.ts" || item === "route.js") {
          try {
            const content = readFileSync(fullPath, "utf8");
            const pathSpecs = extractOpenAPIFromFile(content, fullPath);
            Object.assign(paths, pathSpecs);
          } catch (error) {
            rlog.info(`无法读取文件 ${fullPath}: ${error}`);
          }
        }
      }
    };

    scanDirectory(apiDir);
  } catch (error) {
    rlog.info(`扫描API目录时出错: ${error}`);
  }

  return paths;
}

// 规范化 OpenAPI spec（修复常见的类型问题）
function normalizeOpenAPISpec(spec: any): any {
  if (!spec || typeof spec !== "object") {
    return spec;
  }

  const normalized = { ...spec };

  // 遍历所有路径
  for (const pathKey of Object.keys(normalized)) {
    const pathItem = normalized[pathKey];
    if (!pathItem || typeof pathItem !== "object") continue;

    // 遍历所有 HTTP 方法
    for (const method of ["get", "post", "put", "delete", "patch", "options", "head"]) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;

      // 修复 tags 字段：如果是字符串，转换为字符串数组
      if (operation.tags && typeof operation.tags === "string") {
        operation.tags = [operation.tags];
      }

      // 修复其他可能需要数组的字段
      if (operation.security && typeof operation.security === "string") {
        operation.security = [[operation.security]];
      }
    }
  }

  return normalized;
}

// 修复 schema 中的 $ref 引用路径，并提取内部定义
function fixSchemaRefs(schema: any, definitionsMap: Map<string, any> = new Map()): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // 处理数组
  if (Array.isArray(schema)) {
    return schema.map((item) => fixSchemaRefs(item, definitionsMap));
  }

  // 如果这个对象有 definitions 字段，提取它们
  if (schema.definitions && typeof schema.definitions === "object") {
    for (const [name, def] of Object.entries(schema.definitions)) {
      definitionsMap.set(name, fixSchemaRefs(def, definitionsMap));
    }
    delete schema.definitions;
  }

  // 处理 $ref 字段
  if (schema.$ref) {
    // 将 #/definitions/xxx 替换为 #/components/schemas/xxx
    if (schema.$ref.startsWith("#/definitions/")) {
      schema.$ref = schema.$ref.replace("#/definitions/", "#/components/schemas/");
    }
  }

  // 递归处理所有字段
  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key !== "$ref") {
      result[key] = fixSchemaRefs(value, definitionsMap);
    } else {
      result[key] = schema.$ref;
    }
  }

  return result;
}

// 替换 schema 中的 $ref 引用
function replaceRef(schema: any, oldRef: string, newRef: string): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // 处理数组
  if (Array.isArray(schema)) {
    return schema.map((item) => replaceRef(item, oldRef, newRef));
  }

  // 处理 $ref 字段
  if (schema.$ref && schema.$ref === oldRef) {
    schema = { ...schema, $ref: newRef };
  }

  // 递归处理所有字段
  const result: any = Array.isArray(schema) ? [] : {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = replaceRef(value, oldRef, newRef);
  }

  return result;
}

// 从文件内容中提取OpenAPI规范
function extractOpenAPIFromFile(
  content: string,
  filePath: string,
): Record<string, any> {
  const paths: Record<string, any> = {};

  // 匹配 @openapi 注释块
  const openApiRegex = /\/\*\*\s*\n\s*\*\s*@openapi\s*\n([\s\S]*?)\*\//g;
  let match;

  while ((match = openApiRegex.exec(content)) !== null) {
    try {
      // 清理注释内容，移除 * 前缀
      const yamlContent = match[1]
        ? match[1]
            .split("\n")
            .map((line) => line.replace(/^\s*\*\s?/, ""))
            .join("\n")
            .trim()
        : "";

      if (yamlContent) {
        // 解析YAML内容
        const spec = YAML.parse(yamlContent);

        // 规范化 spec（修复类型问题）
        const normalizedSpec = normalizeOpenAPISpec(spec);

        // 合并到paths对象中
        if (normalizedSpec && typeof normalizedSpec === "object") {
          Object.assign(paths, normalizedSpec);
        }
      }
    } catch (error) {
      rlog.info(`解析OpenAPI注释时出错 (${filePath}): ${error}`);
    }
  }

  return paths;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  security?: Array<Record<string, any>>;
}

export async function generateOpenAPISpec(): Promise<OpenAPISpec> {
  const spec: OpenAPISpec = {
    openapi: "3.0.3",
    info: {
      title: "NeutralPress API",
      description: "NeutralPress CMS API 文档",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "开发环境",
      },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT 访问令牌认证",
        },
      },
    },
  };

  // 扫描API文件获取路径定义
  const apiDir = join(process.cwd(), "../../apps/web/src/app/api");
  rlog.info(`正在扫描API目录: ${apiDir}`);

  try {
    const scannedPaths = scanApiFiles(apiDir);
    spec.paths = scannedPaths;
    rlog.info(`扫描到 ${Object.keys(scannedPaths).length} 个API端点`);
  } catch (error) {
    rlog.error(`API扫描失败，使用默认路径定义: ${error}`);
  }

  // 动态获取 shared-types schemas
  const schemas = await getSharedTypesSchemas();

  // 使用自动发现的schemas
  try {
    // 导入所有API模块来触发schema注册
    await import("@repo/shared-types/api/common");
    await import("@repo/shared-types/api/auth");
    await import("@repo/shared-types/api/page");
    await import("@repo/shared-types/api/post");
    await import("@repo/shared-types/api/user");
    await import("@repo/shared-types/api/audit");
    await import("@repo/shared-types/api/setting");
    await import("@repo/shared-types/api/tag");
    await import("@repo/shared-types/api/category");
    await import("@repo/shared-types/api/captcha");
    await import("@repo/shared-types/api/doctor");
    await import("@repo/shared-types/api/stats");
    // 你可以在这里添加更多的API模块导入

    // 获取所有已注册的schemas
    const registeredSchemas = schemas.getAllRegisteredSchemas
      ? schemas.getAllRegisteredSchemas()
      : [];

    if (registeredSchemas.length === 0) {
      rlog.warning("未发现任何已注册的schemas，可能是因为没有正确导入API模块");
    } else {
      rlog.info(`发现 ${registeredSchemas.length} 个已注册的schemas`);
      rlog.info("转换 schema:");
      registeredSchemas.forEach(
        ({ name, schema }: { name: string; schema: any }, index: number) => {
          convertAndAddSchema(
            spec,
            name,
            schema,
            index,
            registeredSchemas.length,
          );
        },
      );
    }
  } catch (error) {
    rlog.exit(error);
  }

  return spec;
}

// 辅助函数：转换并添加schema
function convertAndAddSchema(
  spec: OpenAPISpec,
  name: string,
  schema: any,
  index: number,
  total: number,
) {
  try {
    // 确保schema是有效的Zod schema
    if (!schema || !schema._def) {
      rlog.error(`Schema ${name} 不是有效的Zod schema`);
      return;
    }

    // 使用Zod v4的原生JSON Schema转换
    const jsonSchema = z.toJSONSchema(schema, {
      target: "openapi-3.0",
    });

    // 清理schema，移除不需要的元数据
    let cleanSchema = { ...jsonSchema };
    delete cleanSchema.$schema;

    // 修复 $ref 引用路径并提取内部定义
    const definitionsMap = new Map<string, any>();
    cleanSchema = fixSchemaRefs(cleanSchema, definitionsMap);

    // 将提取的内部定义添加到顶层 components.schemas
    for (const [defName, defSchema] of definitionsMap.entries()) {
      // 使用唯一名称避免冲突
      const uniqueName = `${name}_${defName}`;

      // 修复定义内部的引用（自引用等情况）
      const fixedDefSchema = replaceRef(defSchema, `#/components/schemas/${defName}`, `#/components/schemas/${uniqueName}`);
      spec.components.schemas[uniqueName] = fixedDefSchema;

      // 替换主 schema 中对这个定义的引用
      cleanSchema = replaceRef(cleanSchema, `#/components/schemas/${defName}`, `#/components/schemas/${uniqueName}`);
    }

    // 添加到组件schemas中
    spec.components.schemas[name] = cleanSchema;

    rlog.progress(index + 1, total);
  } catch (error) {
    rlog.error(`转换schema ${name} 时出错:`, error);
  }
}

// 默认路径定义作为后备

export function saveOpenAPISpec(
  spec: OpenAPISpec,
  outputPath: string = "./openapi.yaml",
) {
  // 默认输出到当前包目录
  const finalOutputPath = outputPath || join(process.cwd(), "openapi.yaml");

  // 确保输出目录存在
  const dir = dirname(finalOutputPath);
  mkdirSync(dir, { recursive: true });

  // 保存为 YAML 格式
  const yamlContent = YAML.stringify(spec, { indent: 2 });
  writeFileSync(finalOutputPath, yamlContent, "utf8");

  // 同时保存为 JSON 格式
  const jsonPath = finalOutputPath.replace(".yaml", ".json");
  writeFileSync(jsonPath, JSON.stringify(spec, null, 2), "utf8");

  rlog.success(`OpenAPI 规范已生成:`);
  rlog.success(` YAML: ${finalOutputPath}`);
  rlog.success(` JSON: ${jsonPath}`);
}
