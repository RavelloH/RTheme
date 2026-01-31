import { config as baseConfig } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Docusaurus 特定忽略
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.source/**',
      'sidebars.json',
    ],
  },
  ...baseConfig,
];