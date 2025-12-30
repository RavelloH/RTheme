-- KEYS:
-- 1: rateKey (np:rate:ip:<ip>)
-- 2: statSuccess (np:stat:success)
-- 3: statError (np:stat:error)
-- 4: statHourSuccess (np:stat:hour:<hour>:success)
-- 5: statHourError (np:stat:hour:<hour>:error)
-- 6: banKey (np:rate:ban:<ip>)
-- 7: endpointKey (np:stat:endpoint)

-- ARGV:
-- 1: now (毫秒时间戳)
-- 2: limit (限流阈值，如 60)
-- 3: apiName (API 名称)
-- 4: expireMs (数据保留时长，如 86400000)
-- 5: windowMs (限流窗口，如 60000)
-- 6: hourStatsTtl (小时统计 TTL，如 2592000)

local now = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local apiName = ARGV[3]
local expireMs = tonumber(ARGV[4])
local windowMs = tonumber(ARGV[5])
local hourStatsTtl = tonumber(ARGV[6])

local rateKey = KEYS[1]
local statSuccess = KEYS[2]
local statError = KEYS[3]
local statHourSuccess = KEYS[4]
local statHourError = KEYS[5]
local banKey = KEYS[6]
local endpointKey = KEYS[7]

-- Step 0: 检查 IP 是否被封禁
if redis.call("EXISTS", banKey) == 1 then
  redis.call("INCR", statError)
  local errExists = redis.call("EXISTS", statHourError)
  redis.call("INCR", statHourError)
  if errExists == 0 then
    redis.call("EXPIRE", statHourError, hourStatsTtl)
  end
  return -1
end

-- Step 1: 删除超过 24 小时的旧记录
redis.call("ZREMRANGEBYSCORE", rateKey, 0, now - expireMs)

-- Step 2: 检查最近 1 分钟的请求数
local count = redis.call("ZCOUNT", rateKey, now - windowMs, "+inf")

if count >= limit then
  -- 被限流
  redis.call("INCR", statError)
  local errExists = redis.call("EXISTS", statHourError)
  redis.call("INCR", statHourError)
  if errExists == 0 then
    redis.call("EXPIRE", statHourError, hourStatsTtl)
  end
  return 0
end

-- Step 3: 允许请求，记录数据
local member = apiName .. ":" .. now
redis.call("ZADD", rateKey, now, member)
redis.call("EXPIRE", rateKey, 86400)

-- Step 4: 更新成功统计
redis.call("INCR", statSuccess)
local succExists = redis.call("EXISTS", statHourSuccess)
redis.call("INCR", statHourSuccess)
if succExists == 0 then
  redis.call("EXPIRE", statHourSuccess, hourStatsTtl)
end

-- Step 5: 更新端点统计（24小时滑动窗口）
redis.call("ZREMRANGEBYSCORE", endpointKey, 0, now - expireMs)
redis.call("ZADD", endpointKey, now, member)
redis.call("EXPIRE", endpointKey, 86400)

return 1
