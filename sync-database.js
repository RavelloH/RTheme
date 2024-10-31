const { exec } = require('child_process');

// 检测数据库是否存在
function checkDatabase() {
    return new Promise((resolve, reject) => {
        exec('npx prisma migrate status', (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

// 同步数据库
function syncDatabase() {
    return new Promise((resolve, reject) => {
        exec('npx prisma migrate dev --name init', (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

// 主函数
async function main() {
    try {
        await checkDatabase();
        console.log('数据库已存在，无需同步。');
    } catch (error) {
        console.log('数据库不存在，正在同步...');
        await syncDatabase();
        console.log('数据库同步完成。');
    }
}

main();