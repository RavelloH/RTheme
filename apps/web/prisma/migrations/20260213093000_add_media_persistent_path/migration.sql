-- 为 Media 增加持久化路径字段
ALTER TABLE "Media"
ADD COLUMN "persistentPath" VARCHAR(255);
