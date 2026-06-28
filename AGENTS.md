# AGENTS.md

## 开发原则

- 开发期间优先遵循官方文档、社区共识和框架最佳实践，不要为了眼前能跑就写临时拼凑方案。
- 遇到框架配置、部署配置、工具链配置或含糊需求时，先查询可靠来源再决定；不要靠猜测一路实现，最后跑偏再大改。
- 解决问题时要尽量定位根因，从更高一层的框架、架构和运行机制理解问题，而不是只修表面现象。
- 没有明确要求时，不要顺手添加额外功能、复杂兜底或无关优化。
- 如果存在多种理解且仓库内容无法判断，先向用户确认，再动手。

## 本地开发约定

- 项目根目录就是当前目录，不要再创建一层 `llmsniffer/`。
- 开发期 Next.js 和 NestJS 都跑在宿主机；Docker 只启动 MongoDB、Redis 这类依赖服务。
- `npm run dev` 是开发入口：先执行 `docker-compose.dev.yml` 拉起 MongoDB/Redis，再并行启动 `apps/api` 和 `apps/web`。
- 单独启动依赖用 `npm run docker:dev`，停止开发依赖用 `npm run docker:dev:down`。
- 部署期使用 `docker-compose.prod.yml`，web、api、MongoDB、Redis 全部容器化；启动命令是 `npm run docker:prod`。
- 开发和生产 Compose 已用不同 `name` 隔离，不要合并成默认 `docker-compose.yml`，否则容易互相重建容器和卷。
