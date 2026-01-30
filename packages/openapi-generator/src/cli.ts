#!/usr/bin/env node

import { generateOpenAPISpec, saveOpenAPISpec } from "./generator.js";
import { resolve } from "path";
import Rlog from "rlog-js";
const rlog = new Rlog();

async function main() {
  rlog.log("正在生成 OpenAPI 规范...");

  try {
    const spec = await generateOpenAPISpec(); // 现在是异步的
    // 输出到当前包目录（openapi-generator）
    const outputPath = resolve(process.cwd(), "openapi.yaml");

    saveOpenAPISpec(spec, outputPath);
  } catch (error) {
    rlog.error("生成 OpenAPI 规范时出错:", error);
    process.exit(1);
  }
}

main();
