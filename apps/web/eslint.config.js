import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Ignore generated code (Prisma client/runtime) and Next.js type declarations
  {
    ignores: ["src/generated/**", ".next/**", "next-env.d.ts"],
  },
  ...nextJsConfig,
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
