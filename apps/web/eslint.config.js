import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Ignore generated code (Prisma client/runtime)
  {
    ignores: ["src/generated/**"],
  },
  ...nextJsConfig,
];
