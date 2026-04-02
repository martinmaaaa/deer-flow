# 中小企业多租户智能体平台 V1

## 产品目标
- 面向中小企业，按“公司”作为租户边界。
- 第一阶段聚焦选题、文案等高频内容场景。
- 平台统一提供智能体，企业成员按授权使用。
- 不改 DeerFlow harness，把 DeerFlow 作为执行引擎，平台层负责租户、授权、线程归属与后台运营。

## 核心模型
### 公司与成员
- `companies`：企业租户。
- `company_members`：企业成员，同公司成员第一阶段全员同权。
- `app_user_profiles`：平台用户补充信息，包含 `platform_role`。
- `company_invites`：管理员开通成员的邀请码记录。

### 平台智能体
- `platform_agents`：平台统一维护的智能体商品。
- `company_agent_grants`：公司对平台智能体的授权关系。
- 每个授权关系都会生成一个 DeerFlow runtime agent：
  - 命名规则：`<company-slug>--<platform-agent-slug>`
  - 通过 DeerFlow `/api/agents` 自动创建或更新

### 会话与线程
- `conversation_threads`：平台业务线程归属表。
- 线程 ID 与 DeerFlow `thread_id` 保持一致。
- 会话默认仅创建者本人可见。

## 架构
### 执行面
- DeerFlow Python Gateway / LangGraph：
  - agent run
  - sandbox
  - uploads
  - artifacts
  - thread execution

### 控制面
- Next.js：
  - `better-auth`
  - 公司/成员/授权
  - 智能体商店与后台
  - 线程归属和权限控制
  - 代理 DeerFlow 内部接口

### 完整服务架构图
```text
┌──────────────────────────────────────────────────────────────┐
│ 入口层                                                       │
├──────────────────────────────────────────────────────────────┤
│ Nginx（3026）                                                │
│ - 反向代理                                                   │
│ - 路由分发                                                   │
│ - 前端 / API 统一入口                                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ 平台控制面（Next.js BFF + Platform Logic）                   │
├──────────────────────────────────────────────────────────────┤
│ - 登录鉴权 / Session                                         │
│ - 公司与成员关系校验                                         │
│ - 平台智能体授权判断                                         │
│ - 线程归属管理                                               │
│ - Company Runtime Agent 解析 / 生成                          │
│   例如：company-a--copywriter                                │
│ - 对 DeerFlow API 做受控代理                                 │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ LangGraph Platform Server    │   │ Gateway (FastAPI)            │
│ （2024）                     │   │ （8001）                     │
├──────────────────────────────┤   ├──────────────────────────────┤
│ - Thread / Run / Stream      │   │ - 模型配置查询               │
│ - Agent 执行入口             │   │ - Skills 管理                │
│ - 状态持久化                 │   │ - Memory 读写                │
│ - 流式响应                   │   │ - 文件上传 / 下载            │
│                              │   │ - Agent CRUD                 │
└──────────────────────────────┘   └──────────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Harness（packages/harness）                                  │
├──────────────────────────────────────────────────────────────┤
│ - 读取 config.configurable.agent_name                        │
│ - 加载对应 agent config / SOUL / model / tool_groups         │
│ - 组装 middleware、prompt、tools、memory                     │
│ - 执行真正的对话逻辑                                         │
└──────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ 配置与文件系统                │   │ 数据与基础设施                │
├──────────────────────────────┤   ├──────────────────────────────┤
│ - config.yaml                │   │ - Postgres                   │
│ - extensions_config.json     │   │ - LangGraph checkpoints      │
│ - skills/                    │   │ - 平台业务数据               │
│ - agents/<runtime-agent>/    │   │ - Redis（如后续接入）        │
│ - .deer-flow/threads         │   │ - 沙箱容器池                 │
└──────────────────────────────┘   └──────────────────────────────┘
```

### 关键说明
- `Company Runtime Agent` 不是单独的服务，而是平台控制面在发起会话前解析出来的一份 DeerFlow custom agent 配置实例。
- 所有公司共享同一套 `Nginx + LangGraph + Gateway + Harness` 执行底座。
- 不同公司的隔离主要通过：
  - 平台权限与线程归属控制
  - 公司级 runtime agent 名称
  - DeerFlow 原生 per-agent memory
- 运营后台里的平台智能体是模板，企业聊天时真正运行的是公司级 runtime agent。

## Memory 策略
- 采用“公司共享、按智能体区分”。
- 通过公司级 runtime agent 名称复用 DeerFlow 的 per-agent memory 机制。
- 当前已具备的是“公司级自动运行记忆”，不新增独立的公司级 memory 产品层。
- 结果：
  - 同公司同智能体共享记忆
  - 同公司不同智能体记忆隔离
  - 不同公司同一平台智能体记忆隔离
- 第一阶段不做：
  - 公司级结构化资料/可配置记忆管理页面
  - 企业手工编辑的品牌设定、禁用表达、标准 CTA 等资料系统

## 接口
### 用户侧
- `GET /api/app/agents/store`
- `GET /api/app/agents/my`
- `GET /api/app/agents/:slug`
- `GET /api/app/threads`
- `POST /api/app/threads`
- `PATCH /api/app/threads/:threadId`
- `DELETE /api/app/threads/:threadId`
- `POST /api/app/threads/:threadId/uploads`
- `GET /api/app/threads/:threadId/artifacts/*`
- `GET/POST /api/app/langgraph/*`（Next.js 代理 DeerFlow）

### 后台
- `GET /api/app/admin/companies`
- `POST /api/app/admin/companies`
- `GET /api/app/admin/companies/:companyId`
- `POST /api/app/admin/companies/:companyId/invites`
- `POST /api/app/admin/companies/:companyId/grants`
- `GET /api/app/admin/platform-agents`
- `POST /api/app/admin/platform-agents`
- `PATCH /api/app/admin/platform-agents/:agentId`

## 页面
### 企业用户端
- `/sign-in`
- `/invite/[token]`
- `/workspace/agents`：智能体商店 + 我的智能体
- `/workspace/chats`：我的会话
- `/workspace/agents/[agent_name]/chats/[thread_id]`：智能体聊天页

### 同站隐藏后台
- `/admin`

## 上线形态
- 单机 Docker Compose
- Next.js 控制面
- DeerFlow Python 服务
- 托管 Postgres
- 本地挂载线程文件目录

## 第一阶段明确不做
- 企业自建智能体
- 技能商店
- 企业长期知识库
- 企业内细粒度权限
- 复杂工作流自动化
- harness 改造
