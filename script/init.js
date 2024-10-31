const { execSync } = require('child_process');
const { exit } = require('process');
const RLog = require('rlog-js');
const rlog = new RLog();

// 初始化:强制同步数据库
try {
    const stdout = execSync('npx prisma migrate deploy --name init');
    rlog.success(`Success: ${stdout.toString()}`);
} catch (error) {
    rlog.error(`Error: ${error.message}`);
    exit
}

// TODO: 生成一些默认数据，例如首篇hello world，站点设置默认值等