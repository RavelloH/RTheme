import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Ignore generated code (Prisma client/runtime) and Next.js type declarations
  {
    ignores: ["src/generated/**", ".next/**", "next-env.d.ts"],
  },
  ...nextJsConfig,
  // 针对 TypeScript 文件的特定配置
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports", // 强制要求使用 import type
          fixStyle: "separate-type-imports", // 将类型导入分行书写，保持整洁
        },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
    },
  },
  // 允许以下划线开头的未使用变量（用于解构时忽略属性）
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
