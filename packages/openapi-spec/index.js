// Generated OpenAPI specification
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 读取JSON文件
function loadSpec() {
    const specPath = join(__dirname, 'spec.json');
    const content = fs.readFileSync(specPath, 'utf-8');
    return JSON.parse(content);
}
export const openApiSpec = loadSpec();
export default openApiSpec;
