import { z } from "zod";
import { createSchema } from "zod-openapi";
import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "fs";
import { dirname, join, extname } from "path";
import YAML from "yaml";
import { createRequire } from "module";

// 使用 require 来导入 CommonJS 模块
const require = createRequire(import.meta.url);
const { default: RlogClass } = require("rlog-js");
const rlog = new RlogClass();

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
    for (const method of [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "options",
      "head",
    ]) {
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
    openapi: "3.1.0",
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

// 辅助函数：转换并添加schema（使用 zod-openapi 的 createSchema API）
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

    // 使用 zod-openapi 的 createSchema API
    // 这会正确处理 OpenAPI 3.1 的特性（nullable、components 等）
    const { schema: initialOpenapiSchema, components } = createSchema(schema, {
      io: "output", // 默认使用 output 模式（用于响应）
      openapiVersion: "3.1.0", // 指定 OpenAPI 版本，确保 nullable 正确转换为 type: ["string", "null"]
      opts: {
        reused: "ref", // 将重用的 schema 提取为引用
        // 修复 OpenAPI 3.1 的 exclusiveMinimum/exclusiveMaximum 格式
        override: ({ jsonSchema }) => {
          // 递归处理 schema
          const fixExclusiveBounds = (schema: any) => {
            if (!schema || typeof schema !== "object") return;

            // OpenAPI 3.0: exclusiveMinimum: 0 (number)
            // OpenAPI 3.1: exclusiveMinimum: true (boolean) + minimum: 0 (number)
            if (
              typeof schema.exclusiveMinimum === "number" &&
              schema.exclusiveMinimum !== undefined
            ) {
              schema.minimum = schema.exclusiveMinimum;
              schema.exclusiveMinimum = true;
            }
            if (
              typeof schema.exclusiveMaximum === "number" &&
              schema.exclusiveMaximum !== undefined
            ) {
              schema.maximum = schema.exclusiveMaximum;
              schema.exclusiveMaximum = true;
            }

            // 递归处理嵌套对象
            if (schema.properties) {
              Object.values(schema.properties).forEach(fixExclusiveBounds);
            }
            if (schema.items) {
              if (Array.isArray(schema.items)) {
                schema.items.forEach(fixExclusiveBounds);
              } else {
                fixExclusiveBounds(schema.items);
              }
            }
            // 处理 allOf, anyOf, oneOf
            ["allOf", "anyOf", "oneOf"].forEach((key) => {
              if (Array.isArray(schema[key])) {
                schema[key].forEach(fixExclusiveBounds);
              }
            });
          };

          fixExclusiveBounds(jsonSchema);
        },
      },
    });

    // 合并 components（如果 schema 使用了 .meta({ id: 'xxx' }) 注册的组件）
    let openapiSchema = initialOpenapiSchema;
    if (components) {
      // 处理 $defs - zod-openapi 可能将内部引用放在这里
      if (components.$defs) {
        // 将 $defs 合并到 schemas，并生成唯一名称避免冲突
        for (const [defName, originalDefSchema] of Object.entries(
          components.$defs,
        )) {
          const uniqueName = `${name}_${defName}`;

          // 修复引用路径：将 #/$defs/__schemaX 替换为 #/components/schemas/Name___schemaX
          const updatedDefSchema = replaceRefs(
            originalDefSchema,
            `#/$defs/${defName}`,
            `#/components/schemas/${uniqueName}`,
          );
          spec.components.schemas[uniqueName] = updatedDefSchema;

          // 同时修复主 schema 中的引用
          openapiSchema = replaceRefs(
            openapiSchema,
            `#/$defs/${defName}`,
            `#/components/schemas/${uniqueName}`,
          );
        }
      }

      if (components.schemas) {
        Object.assign(spec.components.schemas, components.schemas);
      }
      // 可以根据需要合并其他类型的 components
      // if (components.parameters) {
      //   Object.assign(spec.components.parameters, components.parameters);
      // }
    }

    // 添加主 schema
    spec.components.schemas[name] = openapiSchema;

    // 修复循环引用：递归检查并修复所有指向 __schemaX 的引用
    // 对于 z.lazy() 的循环引用，将 #/components/schemas/__schemaX 替换为指向当前 schema
    if (openapiSchema && typeof openapiSchema === "object") {
      // 查找所有指向 __schema 的引用
      const findAndFixSchemaRefs = (obj: any): any => {
        if (!obj || typeof obj !== "object") {
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(findAndFixSchemaRefs);
        }

        // 如果是 $ref 指向 __schema，替换为当前 schema
        if (
          obj.$ref &&
          typeof obj.$ref === "string" &&
          obj.$ref.includes("__schema")
        ) {
          return { ...obj, $ref: `#/components/schemas/${name}` };
        }

        // 递归处理对象的所有属性
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = findAndFixSchemaRefs(value);
        }
        return result;
      };

      spec.components.schemas[name] = findAndFixSchemaRefs(openapiSchema);
    }

    rlog.progress(index + 1, total);
  } catch (error) {
    rlog.error(`转换schema ${name} 时出错:`, error);
  }
}

// 递归替换 schema 中的 $ref 路径
function replaceRefs(obj: any, oldRef: string, newRef: string): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceRefs(item, oldRef, newRef));
  }

  if (obj.$ref === oldRef) {
    return { ...obj, $ref: newRef };
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = replaceRefs(value, oldRef, newRef);
  }

  return result;
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
