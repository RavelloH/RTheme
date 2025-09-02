#!/usr/bin/env node

import { generateOpenAPISpec, saveOpenAPISpec } from "./generator.js";
import { resolve } from "path";
import Rlog from "rlog-js";
const rlog = new Rlog();

function main() {
  rlog.log("正在生成 OpenAPI 规范...");

  try {
    const spec = generateOpenAPISpec();
    // 生成到 openapi-spec 包目录
    const outputPath = resolve(process.cwd(), "../openapi-spec/openapi.yaml");

    saveOpenAPISpec(spec, outputPath);
  } catch (error) {
    rlog.error("生成 OpenAPI 规范时出错:", error);
    process.exit(1);
  }
}

main();
