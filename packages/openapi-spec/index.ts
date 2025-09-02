// Generated OpenAPI specification
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface OpenAPISpec {
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

// 读取JSON文件
function loadSpec(): OpenAPISpec {
  const specPath = join(__dirname, "openapi.json");
  const content = fs.readFileSync(specPath, "utf-8");
  return JSON.parse(content);
}

export const openApiSpec: OpenAPISpec = loadSpec();

export default openApiSpec;
