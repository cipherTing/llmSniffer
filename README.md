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
  重点展示可用率、近期稳定性、多通道趋势、厂商覆盖和探测声明，帮助用户快速判断哪个第三方中转站当前更好用。
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
      <strong>给真实探测的</strong>
      <br />
      保留真实消耗探测和免责声明，让数据来源与使用边界更清楚。
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
      <h3>明暗主题</h3>
      <p>前端支持 light / dark 主题切换，表格、趋势块、Tooltip 和声明区域都适配主题变量。</p>
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

### 2. 启动开发环境

```bash
npm run dev
```

该命令会先通过 `docker-compose.dev.yml` 启动 MongoDB 和 Redis，然后在宿主机并行启动 API 和 Web。

### 3. 打开本地服务

| 服务 | 地址 |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| 健康检查 | `http://localhost:3001/health` |

### 4. 停止开发环境

```bash
npm run dev:down
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地依赖、API 和 Web |
| `npm run dev:web` | 只启动 Web |
| `npm run dev:api` | 只启动 API |
| `npm run docker:dev` | 只启动 MongoDB 和 Redis |
| `npm run docker:dev:down` | 停止 MongoDB 和 Redis |
| `npm run lint` | 运行所有 workspace 的 lint |
| `npm run build` | 构建所有 workspace |
| `npm run test` | 运行 API 测试 |

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
