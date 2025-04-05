{
  echo a    # 选择全部
  sleep 3
  echo y    # 确认执行
} | pnpm approve-builds @prisma/engines prisma sharp argon2 @prisma/client ref-napi
