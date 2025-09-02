import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as schemas from "@repo/shared-types";
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

        // 合并到paths对象中
        if (spec && typeof spec === "object") {
          Object.assign(paths, spec);
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
  };
}

export function generateOpenAPISpec(): OpenAPISpec {
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

  // 从 shared-types 生成 schema 定义
  const schemaDefinitions = [
    { name: "User", schema: schemas.UserSchema },
    { name: "CreateUser", schema: schemas.CreateUserSchema },
    { name: "UpdateUser", schema: schemas.UpdateUserSchema },
    { name: "UsersListResponse", schema: schemas.UsersListResponseSchema },
    { name: "Post", schema: schemas.PostSchema },
    { name: "CreatePost", schema: schemas.CreatePostSchema },
    { name: "UpdatePost", schema: schemas.UpdatePostSchema },
    { name: "PostsListResponse", schema: schemas.PostsListResponseSchema },
    { name: "Category", schema: schemas.CategorySchema },
    { name: "CreateCategory", schema: schemas.CreateCategorySchema },
    { name: "UpdateCategory", schema: schemas.UpdateCategorySchema },
    { name: "Tag", schema: schemas.TagSchema },
    { name: "CreateTag", schema: schemas.CreateTagSchema },
    { name: "ApiResponse", schema: schemas.ApiResponseSchema },
    { name: "ErrorResponse", schema: schemas.ErrorResponseSchema },
    { name: "Pagination", schema: schemas.PaginationSchema },
  ];

  // 转换 Zod schema 为 JSON Schema
  schemaDefinitions.forEach(({ name, schema }) => {
    const jsonSchema = zodToJsonSchema(schema, {
      name,
      // 移除顶级的 $ref 和 definitions，直接使用定义
      $refStrategy: "none",
    });

    // 清理生成的 schema，移除多余的包装
    if (
      (jsonSchema as any).definitions &&
      (jsonSchema as any).definitions[name]
    ) {
      spec.components.schemas[name] = (jsonSchema as any).definitions[name];
    } else {
      // 去掉 $ref 和 definitions 包装
      const cleanSchema = { ...jsonSchema } as any;
      delete cleanSchema.$ref;
      delete cleanSchema.definitions;
      delete cleanSchema.$schema;
      spec.components.schemas[name] = cleanSchema;
    }
  });

  return spec;
}

// 默认路径定义作为后备

export function saveOpenAPISpec(
  spec: OpenAPISpec,
  outputPath: string = "./openapi.yaml",
) {
  // 确保输出目录存在
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  // 保存为 YAML 格式
  const yamlContent = YAML.stringify(spec, { indent: 2 });
  writeFileSync(outputPath, yamlContent, "utf8");

  // 同时保存为 JSON 格式
  const jsonPath = outputPath.replace(".yaml", ".json");
  writeFileSync(jsonPath, JSON.stringify(spec, null, 2), "utf8");

  rlog.success(`OpenAPI 规范已生成:`);
  rlog.success(` YAML: ${outputPath}`);
  rlog.success(` JSON: ${jsonPath}`);
}
