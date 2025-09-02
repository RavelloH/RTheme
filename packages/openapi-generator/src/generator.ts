import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as schemas from "@repo/shared-types";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import YAML from "yaml";
import Rlog from "rlog-js";
const rlog = new Rlog();

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

  // 生成基本的 API 路径定义
  spec.paths = {
    "/api/users": {
      get: {
        summary: "获取用户列表",
        tags: ["Users"],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
        ],
        responses: {
          "200": {
            description: "成功返回用户列表",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsersListResponse" },
              },
            },
          },
          "500": {
            description: "服务器错误",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        summary: "创建用户",
        tags: ["Users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUser" },
            },
          },
        },
        responses: {
          "201": {
            description: "用户创建成功",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": {
            description: "请求参数错误",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/posts": {
      get: {
        summary: "获取文章列表",
        tags: ["Posts"],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: "published",
            in: "query",
            schema: { type: "boolean" },
          },
        ],
        responses: {
          "200": {
            description: "成功返回文章列表",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PostsListResponse" },
              },
            },
          },
        },
      },
      post: {
        summary: "创建文章",
        tags: ["Posts"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePost" },
            },
          },
        },
        responses: {
          "201": {
            description: "文章创建成功",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Post" },
              },
            },
          },
        },
      },
    },
  };

  return spec;
}

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
