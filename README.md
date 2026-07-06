<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://capsule-render.vercel.app/api?type=waving&height=180&color=0:0f172a,100:2563eb&text=LLMSniffer&fontColor=ffffff&fontSize=42&fontAlignY=38&desc=%E7%AC%AC%E4%B8%89%E6%96%B9%20AI%20%E4%B8%AD%E8%BD%AC%E7%AB%99%E5%81%A5%E5%BA%B7%E7%9B%91%E6%8E%A7%E5%88%97%E8%A1%A8&descAlignY=60&descSize=16" />
    <img src="https://capsule-render.vercel.app/api?type=waving&height=180&color=0:f8fafc,100:2563eb&text=LLMSniffer&fontColor=0f172a&fontSize=42&fontAlignY=38&desc=%E7%AC%AC%E4%B8%89%E6%96%B9%20AI%20%E4%B8%AD%E8%BD%AC%E7%AB%99%E5%81%A5%E5%BA%B7%E7%9B%91%E6%8E%A7%E5%88%97%E8%A1%A8&descAlignY=60&descSize=16" alt="LLMSniffer" width="100%" />
  </picture>
</p>

<p align="center">
  <a href="https://github.com/cipherTing/llmSniffer">
    <img alt="GitHub Repo" src="https://img.shields.io/badge/GitHub-llmSniffer-181717?logo=github" />
  </a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white" />
  <a href="./LICENSE">
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-blue.svg" />
  </a>
  <img alt="状态" src="https://img.shields.io/badge/%E7%8A%B6%E6%80%81-%E5%BC%80%E5%8F%91%E4%B8%AD-16a34a" />
</p>

<p align="center">
  <b>高密度、易扫读、面向普通用户的 AI 中转站可用性观察面板。</b>
  <br />
  重点展示可用率、近期稳定性、多通道趋势、厂商覆盖和探测声明，并提供管理后台维护收录站点。
</p>

<p align="center">
  <a href="#核心能力"><strong>核心能力</strong></a>
  ·
  <a href="#快速开始"><strong>快速开始</strong></a>
  ·
  <a href="#常用命令"><strong>常用命令</strong></a>
  ·
  <a href="#生产部署"><strong>生产部署</strong></a>
</p>

---

## 项目定位

LLMSniffer 是一个用于查看第三方 AI 中转站健康信息的监控列表，不是本站自有服务的状态页，也不是账号池管理后台。

页面里的中转站都应被视为第三方站点。项目关注的是“可用性观察”和“横向比较”，不是替任何服务商做信誉背书。

<table>
  <tr>
    <td width="33%">
      <strong>给用户看的</strong>
      <br />
      用普通用户能理解的方式呈现可用率、趋势和慢请求，不直接抛出复杂分位指标。
    </td>
    <td width="33%">
      <strong>给选择用的</strong>
      <br />
      列表默认高密度展示，减少大面积汇总卡片，优先帮助用户比较具体中转站。
    </td>
    <td width="33%">
      <strong>给收录管理的</strong>
      <br />
      通过管理后台维护第三方中转站、请求探针和管理员权限，让首页数据来源更清楚。
    </td>
  </tr>
</table>

## 核心能力

<table>
  <tr>
    <td width="50%">
      <h3>可用性列表</h3>
      <p>用紧凑表格展示中转站状态、厂商、可用率和趋势。状态与可用率居中展示，列表默认避免横向滚动。</p>
    </td>
    <td width="50%">
      <h3>多通道趋势</h3>
      <p>同一中转站可展示多个监控通道，趋势按通道顺序直接展开，适合观察主通道、备用通道和不同厂商路线。</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>赞助与探测标注</h3>
      <p>支持普通赞助商和高级赞助商标识。高级赞助商排序置顶，并在列表左侧显示黄色强调线。</p>
    </td>
    <td width="50%">
      <h3>管理后台</h3>
      <p>支持系统管理员初始化、登录、管理员维护、第三方中转站收录、请求探针配置和站点删除确认。</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>明暗主题</h3>
      <p>前端支持 light / dark 主题切换，表格、趋势块、Tooltip 和声明区域都适配主题变量。</p>
    </td>
    <td width="50%">
      <h3>本地开发保护</h3>
      <p>开发入口会自动清理旧的 Web/API 监听进程，避免 Next.js 或 NestJS 残留进程占用端口。</p>
    </td>
  </tr>
</table>

## 技术栈

| 模块 | 技术 |
| --- | --- |
| Monorepo | npm workspaces |
| Web | Next.js 16、React 19、Tailwind CSS、Ant Design、Zustand、next-themes |
| API | NestJS 11、Mongoose、Redis |
| 本地依赖 | Docker Compose、MongoDB、Redis |
| 部署 | Docker Compose 生产编排 |

## 目录结构

```text
apps/
  api/   NestJS API 服务
  web/   Next.js 前端应用
scripts/ 开发辅助脚本
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 准备本地配置

```bash
cp .env.example .env
```

先给 `.env` 里的 `ADMIN_BOOTSTRAP_TOKEN` 填一个只用于首次初始化的随机口令。

如果本机 `27017` 或 `6379` 已被其他项目占用，改 `.env` 里的 `MONGO_PORT` 和 `REDIS_PORT` 即可；`MONGODB_URI` 和 `REDIS_URL` 会跟着端口变量展开。

本地 Web 页面可以用 `localhost:3000` 或 `127.0.0.1:3000` 打开；`WEB_ORIGIN` 支持用英文逗号配置多个允许来源。`NEXT_PUBLIC_API_BASE_URL` 默认留空即可，前端会按当前页面地址推导 API 地址。

常用环境变量：

| 变量 | 说明 |
| --- | --- |
| `ADMIN_BOOTSTRAP_TOKEN` | 首次初始化系统管理员时使用的口令，生产环境必须配置 |
| `WEB_ORIGIN` | API 允许访问的 Web 来源，多个来源用英文逗号分隔 |
| `NEXT_PUBLIC_API_BASE_URL` | 前端显式指定 API 地址；本地通常留空，让前端自动按当前页面地址推导 |
| `MONGO_PORT` / `REDIS_PORT` | 本地 Docker 暴露端口，避免和其他项目冲突 |

### 3. 启动开发环境

```bash
npm run dev
```

该命令会先清理旧的 `3000` / `3001` 开发进程，再通过 `docker-compose.dev.yml` 启动 MongoDB 和 Redis，最后在宿主机并行启动 API 和 Web。

### 4. 打开本地服务

| 服务 | 地址 |
| --- | --- |
| Web | `http://localhost:3000` |
| 管理后台 | `http://localhost:3000/admin` |
| API | `http://localhost:3001` |
| 健康检查 | `http://localhost:3001/health` |

第一次打开管理后台时，如果还没有系统管理员，会进入初始化页面。填写 `.env` 里的 `ADMIN_BOOTSTRAP_TOKEN` 后即可创建系统管理员。

### 5. 停止开发环境

```bash
npm run dev:down
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地依赖、API 和 Web |
| `npm run dev:stop` | 停止占用 `3000` / `3001` 的本项目开发进程 |
| `npm run dev:web` | 只启动 Web |
| `npm run dev:api` | 只启动 API |
| `npm run docker:dev` | 只启动 MongoDB 和 Redis |
| `npm run docker:dev:down` | 停止 MongoDB 和 Redis |
| `npm run lint` | 运行所有 workspace 的 lint |
| `npm run build` | 构建所有 workspace |
| `npm run test` | 运行 API 测试 |

本地单独启动 Worker：

```bash
WORKER_ROLE=scheduler npm run start:worker:dev --workspace api
WORKER_ROLE=probe-openai npm run start:worker:dev --workspace api
WORKER_ROLE=metrics npm run start:worker:dev --workspace api
WORKER_ROLE=snapshot npm run start:worker:dev --workspace api
docker compose -f docker-compose.dev.yml --profile workers up -d
```

## 生产部署

构建并启动生产环境：

```bash
npm run docker:prod
```

停止生产环境：

```bash
npm run docker:prod:down
```

生产环境 Compose 会把 Web、API、MongoDB 和 Redis 全部容器化运行。

## 声明

LLMSniffer 展示的是第三方中转站探测结果，数据仅供技术参考，不构成对任何服务商信誉、稳定性或资金安全的承诺。

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

<p align="center">
  <sub>为更实用的中转站可用性比较而构建。</sub>
</p>
