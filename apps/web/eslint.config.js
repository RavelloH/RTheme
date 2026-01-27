import { nextJsConfig } from "@repo/eslint-config/next-js";
import reactCompiler from "eslint-plugin-react-compiler";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Ignore generated code (Prisma client/runtime) and Next.js type declarations
  {
    ignores: ["src/generated/**", ".next/**", "next-env.d.ts"],
  },
  ...nextJsConfig,

  {
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  },
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
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
      "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
      "react-hooks/exhaustive-deps": "warn",
      // "react/no-array-index-key": "warn",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
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
