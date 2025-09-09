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

// 从文件内容中提取OpenAPI规范
function extractOpenAPIFromFile(
  content: string,
  filePath: string
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
    // 你可以在这里添加更多的API模块导入

    // 获取所有已注册的schemas
    const registeredSchemas = schemas.getAllRegisteredSchemas
      ? schemas.getAllRegisteredSchemas()
      : [];

    if (registeredSchemas.length === 0) {
      rlog.warning("未发现任何已注册的schemas，可能是因为没有正确导入API模块");
    } else {
      rlog.info(`发现 ${registeredSchemas.length} 个已注册的schemas`);
      registeredSchemas.forEach(
        ({ name, schema }: { name: string; schema: any }) => {
          convertAndAddSchema(spec, name, schema);
        }
      );
    }
  } catch (error) {
    rlog.exit(error);
  }

  return spec;
}

// 辅助函数：转换并添加schema
function convertAndAddSchema(spec: OpenAPISpec, name: string, schema: any) {
  try {
    rlog.info(`正在转换schema: ${name}`);
    
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
    const cleanSchema = { ...jsonSchema };
    delete cleanSchema.$schema;
    
    // 添加到组件schemas中
    spec.components.schemas[name] = cleanSchema;
    
    rlog.success(`成功转换schema: ${name}`);
  } catch (error) {
    rlog.error(`转换schema ${name} 时出错:`, error);
  }
}

// 默认路径定义作为后备

export function saveOpenAPISpec(
  spec: OpenAPISpec,
  outputPath: string = "./openapi.yaml"
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
