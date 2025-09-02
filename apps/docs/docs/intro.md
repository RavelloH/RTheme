---
sidebar_position: 1
tags:
  - 部署
---

# 快速部署

NeutralPress 支持多种部署方式。主要可分为：

- 托管到云服务平台（如 Vercel、Netlify 等）
- Docker 容器化部署
- Node.js 环境部署

得益于现代化的 Next.js SSG & ISR 技术，NeutralPress 仅在内容出现变更时才会动态增量再生，其余时间均为静态文件，极大地降低了部署和运维成本。  
这意味着使用免费的云部署平台即可完全胜任大部分中小型网站的部署需求。

## 云服务平台托管

### Vercel

推荐使用 Vercel 进行部署，Vercel 是 Next.js 的官方托管平台，提供了对 Next.js 应用的最佳支持。
