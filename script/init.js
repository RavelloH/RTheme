const { execSync } = require('child_process');
const { exit } = require('process');
const RLog = require('rlog-js');
const rlog = new RLog();

// 初始化:强制同步数据库
try {
    const stdout = execSync('npx prisma migrate dev --name init');
    rlog.success(`Success: ${stdout.toString()}`);
} catch (error) {
    rlog.error(`Error: ${error.message}`);
    exit(1);
}