const RLog = require('rlog-js');
const { execSync } = require('child_process');
const { exit } = require('process');
const rlog = new RLog();

// 计时
const start = Date.now();

// Start build
rlog.info('Start build check...');

// 生成prisma client
rlog.info('Generate prisma client...');
try {
    const stdout = execSync('npx prisma generate');
    rlog.success(`Success: ${stdout.toString()}`);
} catch (error) {
    rlog.error(`Error: ${error.message}`);
    exit(1);
}
rlog.success('Prisma client generated.');

// 检测数据库是否存在
rlog.info('Checking remote database...');
try {
    const stdout = execSync('npx prisma migrate status');
    rlog.success(`Success: ${stdout.toString()}`);
} catch (error) {
    rlog.error(`Error: ${error.message}`);
    rlog.info('Syncing database...');
    // 数据库没migration记录，需要创建
    // 运行初始化脚本: init.js
    try {
        const stdout = execSync('node script/init.js');
        rlog.success(`Success: ${stdout.toString()}`);
    } catch (error) {
        rlog.error(`Error: ${error.message}`);
        exit(1);
    }
}
rlog.success('Database chekced.');

// 同步数据库
rlog.info("Start sync database...");
try {
    const stdout = execSync('npx prisma migrate deploy');
    rlog.success(`Success: ${stdout.toString()}`);
} catch (error) {
    rlog.error(`Error: ${error.message}`);
    exit(1);
}
rlog.success('Database synced.');

const time = ((Date.now() - start) / 1000).toFixed(2);
rlog.success(`Build check completed in ${time}s.`);