/**
 * 配置缓存生成脚本
 * 在生产构建前运行，将数据库中的配置缓存到文件系统中
 */

import fs from 'fs'
import path from 'path'
import RLog from 'rlog-js'
import { type PrismaClient } from '@prisma/client'

const rlog = new RLog()

// 配置对象类型定义
interface ConfigItem {
  key: string
  value: unknown
  description?: string | null
  updatedAt: Date
}

async function generateConfigCache() {
  const CACHE_FILE_PATH = path.join(process.cwd(), '.next', 'config-cache.json')
  
  try {
    rlog.log('正在生成配置缓存文件...')
    
    // 确保 .next 目录存在
    const cacheDir = path.dirname(CACHE_FILE_PATH)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    
    // 动态导入 Prisma 客户端以避免初始化问题
    let prisma: PrismaClient
    try {
      // 使用 file:// URL 格式导入以确保在 Windows 上正确工作
      const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client')
      const clientUrl = `file://${clientPath.replace(/\\/g, '/')}`
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
      rlog.warning('Prisma 客户端未初始化，创建空缓存文件')
      rlog.warning('错误详情:', error)
      const result: Record<string, ConfigItem> = {}
      fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(result, null, 2), 'utf-8')
      rlog.log(`配置缓存已生成: ${CACHE_FILE_PATH}`)
      rlog.log(`缓存了 0 个配置项（Prisma 未就绪）`)
      return
    }
    
    // 从数据库获取所有配置
    const configs = await prisma.config.findMany({
      orderBy: { key: 'asc' }
    })
    
    const result: Record<string, ConfigItem> = {}
    
    configs.forEach((config: { key: string; value: unknown; description: string | null; updatedAt: Date }) => {
      result[config.key] = {
        key: config.key,
        value: config.value,
        description: config.description,
        updatedAt: config.updatedAt
      }
    })
    
    // 写入缓存文件
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(result, null, 2), 'utf-8')
    
    rlog.log(`配置缓存已生成: ${CACHE_FILE_PATH}`)
    rlog.log(`缓存了 ${Object.keys(result).length} 个配置项`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('生成配置缓存失败:', error)
    throw error
  }
}

async function main() {
  rlog.log('开始生成配置缓存...')
  
  try {
    await generateConfigCache()
    rlog.log('配置缓存生成完成')
    process.exit(0)
  } catch (error) {
    console.error('配置缓存生成失败:', error)
    process.exit(1)
  }
}

main()