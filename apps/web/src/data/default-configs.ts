/**
 * 默认配置数据
 * 这些配置将在首次运行时添加到数据库中
 */

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

export interface DefaultConfig {
  key: string
  value: JsonValue
  description?: string
}

// 网站基础配置
export const defaultConfigs: DefaultConfig[] = [
  {
    key: 'site.title',
    value: 'NeutralPress',
    description: '网站标题'
  },
  {
    key: 'site.description', 
    value: '一个现代化的内容管理系统',
    description: '网站描述'
  },
  {
    key: 'site.keywords',
    value: ['CMS', 'Blog', 'NeutralPress'],
    description: '网站关键词'
  },
  {
    key: 'site.logo',
    value: '/icon',
    description: '网站Logo路径'
  },
  {
    key: 'site.favicon',
    value: '/favicon.ico', 
    description: '网站图标路径'
  },
  {
    key: 'user.registration.enabled',
    value: true,
    description: '是否允许用户注册'
  },
  {
    key: 'user.email.verification.required',
    value: true,
    description: '是否需要邮箱验证'
  },
  {
    key: 'content.comments.enabled',
    value: true,
    description: '是否启用评论功能'
  },
  {
    key: 'media.upload.allowed_types',
    value: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    description: '允许上传的媒体文件类型'
  }
]

// 其他默认数据可以在这里添加，例如：
// export const defaultCategories = [...]
// export const defaultTags = [...]
// export const defaultMenus = [...]
