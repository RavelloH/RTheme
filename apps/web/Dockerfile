FROM node:22-bookworm-slim

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

# 通用镜像：构建阶段不依赖业务数据库/Redis
RUN pnpm --filter @repo/shared-types run build
RUN pnpm --filter web run gen-prisma
RUN pnpm --filter web run build:portable

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start"]
