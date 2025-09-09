const fs = require('fs');
const path = require('path');

const sidebarTsPath = path.join(__dirname, '../docs/api/sidebar.ts');
const sidebarJsPath = path.join(__dirname, '../docs/api/sidebar.js');

if (fs.existsSync(sidebarTsPath)) {
  const content = fs.readFileSync(sidebarTsPath, 'utf8');
  
  // 转换 TypeScript 到 JavaScript
  const jsContent = content
    .replace(/import type.*from.*;\n/g, '') // 移除 type imports
    .replace(/: SidebarsConfig/g, '') // 移除类型注解
    .replace(/export default/g, 'module.exports ='); // 转换 export 语法
  
  fs.writeFileSync(sidebarJsPath, jsContent);
  console.log('✅ 成功转换 sidebar.ts 到 sidebar.js');
} else {
  console.log('⚠️  未找到 sidebar.ts 文件');
}