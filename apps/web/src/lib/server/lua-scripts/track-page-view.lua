-- Lua 脚本：原子操作写入队列和更新计数器
-- KEYS[1] = 队列 key (np:analytics:event)
-- KEYS[2] = 计数器 key (np:view_count:all)
-- ARGV[1] = 页面浏览数据 JSON
-- ARGV[2] = 路径
-- 返回：队列长度

local queue_key = KEYS[1]
local counter_key = KEYS[2]
local page_view_data = ARGV[1]
local path = ARGV[2]

-- 1. 写入队列
redis.call('RPUSH', queue_key, page_view_data)

-- 2. 计数器 +1
redis.call('HINCRBY', counter_key, path, 1)

-- 3. 返回队列长度
return redis.call('LLEN', queue_key)
