// scripts/seed-defaults.ts
// 数据库默认值种子脚本

import path from 'path'
import { pathToFileURL } from 'url'
import RLog from 'rlog-js'
import { type PrismaClient } from '@prisma/client'

const rlog = new RLog()

// 从数据文件导入默认配置
import { defaultConfigs } from '../src/data/default-configs.js'

async function seedDefaults() {
  try {
    rlog.log('> Checking and adding database default values...')
    
    // 动态导入 Prisma 客户端以避免初始化问题
    let prisma: PrismaClient
    try {
      // 使用 pathToFileURL 确保跨平台兼容性
      const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client')
      const clientUrl = pathToFileURL(clientPath).href
      const { PrismaClient } = await import(clientUrl)
      
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      })
      
      // 测试连接
      await prisma.$connect()
    } catch (error) {
      rlog.warning('Prisma client not initialized, skipping default value seeding')
      rlog.warning('Error details:', error)
      return
    }

    // 种子化默认配置
    await seedDefaultConfigs(prisma)
    
    rlog.success('  Database default values check completed')
    await prisma.$disconnect()
  } catch (error) {
    rlog.error('Database default value seeding failed:', error)
    throw error
  }
}

// 种子化默认配置
async function seedDefaultConfigs(prisma: PrismaClient) {
  rlog.log('  Checking default configurations...')
  
  let addedCount = 0
  let skippedCount = 0
  
  // 一次性获取所有现有配置，避免 N+1 查询问题
  const existingConfigs = await prisma.config.findMany({
    select: { key: true }
  })
  
  // 创建现有配置 key 的 Set，便于快速查找
  const existingKeys = new Set(existingConfigs.map((config: { key: string }) => config.key))
  
  // 准备要添加的配置数据
  const configsToAdd = []
  
  for (const config of defaultConfigs) {
    if (!existingKeys.has(config.key)) {
      configsToAdd.push({
        key: config.key,
        value: config.value,
        description: config.description
      })
      addedCount++
    } else {
      skippedCount++
    }
  }
  
  // 批量创建新配置
  if (configsToAdd.length > 0) {
    try {
      await prisma.config.createMany({
        data: configsToAdd
      })
      
      // 记录添加的配置
      for (const config of configsToAdd) {
        rlog.log(`  | Added config: ${config.key}`)
      }
    } catch (error) {
      rlog.error(`  | Batch config creation failed:`, error)
      
      // 如果批量添加失败，尝试逐个添加（降级处理）
      for (const config of configsToAdd) {
        try {
          await prisma.config.create({
            data: config
          })
          rlog.log(`  | Added config: ${config.key}`)
        } catch (individualError) {
          rlog.error(`  | Failed to add config ${config.key}:`, individualError)
          addedCount--
        }
      }
    }
  }
  
  rlog.success(`  Configuration check completed: added ${addedCount} items, skipped ${skippedCount} items`)
}

// 导出主函数供其他脚本使用
export { seedDefaults }

// 主函数 - 用于直接运行脚本
async function main() {
  
  try {
    await seedDefaults()
    rlog.success('  Database default value seeding completed')
  } catch (error) {
    rlog.error('  Database default value seeding failed:', error)
    process.exit(1)
  }
}

// 只有在直接运行此脚本时才执行
if (process.argv[1] && (process.argv[1].endsWith('seed-defaults.ts') || process.argv[1].endsWith('seed-defaults.js'))) {
  rlog.log('Starting database default value seeding...')
  main()
}
