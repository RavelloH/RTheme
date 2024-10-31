FROM node:20-alpine AS base

FROM base AS deps

WORKDIR /app

COPY . .

RUN npm install -g pnpm
RUN pnpm install

FROM base AS builder


WORKDIR /app
COPY --from=deps /app/ .

RUN npm install -g pnpm

ENV NODE_ENV production

ARG DATABASE_URL
ARG BUFFER
ARG PEPPER
ARG JWT_KEY
ARG JWT_PUB_KEY

ENV DATABASE_URL=${DATABASE_URL}
ENV BUFFER=${BUFFER}
ENV PEPPER=${PEPPER}
ENV JWT_KEY=${JWT_KEY}
ENV JWT_PUB_KEY=${JWT_PUB_KEY}

RUN pnpm build

FROM base AS runner
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3000
ENV PORT 3000

CMD echo "RTheme [V4] Image." && pnpm start