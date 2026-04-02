# Git Upstream Sync Guide

## Goal
这个仓库后续按“官方 DeerFlow 持续更新，我方平台持续二开”的方式维护。

## Remotes
- `upstream`：官方 DeerFlow 仓库
- `origin`：我方自己的产品仓库

如果当前 `origin` 还是官方仓库，等你自己的 GitHub 仓库建好后执行：

```bash
git remote rename origin upstream
git remote add origin <your-platform-repo-url>
git fetch upstream
git fetch origin
```

## Branches
- `main`：我方正式产品主线
- `feat/*`：日常功能开发
- `fix/*`：日常问题修复
- `sync/upstream-YYYYMMDD`：同步官方更新时使用

## Team Rules

### 什么时候开 `feat/*`
- 做我方自己的产品功能、页面、接口、文档、脚本时
- 不涉及同步官方 DeerFlow 更新时

固定流程：

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature
```

完成后：
- 本地验证
- 提 PR
- 合回 `main`

### 什么时候开 `sync/*`
- 需要继承官方 DeerFlow 的 bug 修复或新提交时
- 这类分支只做“同步上游 + 解冲突”，不顺手开发业务功能

固定流程：

```bash
git fetch upstream
git checkout main
git pull origin main
git checkout -b sync/upstream-2026-04-02
git merge --no-ff upstream/main
```

完成后：
- 解决冲突
- 跑测试
- 本地验证页面和核心功能
- 提 PR
- 合回 `main`

### 最后怎么合到 `main`
- `feat/*` 评审通过后，直接合到 `main`
- `sync/*` 验证通过后，直接合到 `main`
- 不要把 `feat/*` 先合到 `sync/*`
- 不要把 `sync/*` 先合到 `feat/*`
- 两类分支都统一回到 `main`

## Daily Development
开发新功能时，默认按 `feat/*` 规则执行。

## Sync Upstream
同步官方 DeerFlow 更新时，默认按 `sync/*` 规则执行。

## Rules
- 不要直接在 `main` 上开发
- 不要把“同步上游”和“业务开发”放在同一个分支
- 尽量少改 `backend/packages/harness/deerflow/*`
- 平台能力优先新增在 `frontend/src/server/platform/*`、`frontend/src/app/api/app/*`、`frontend/src/components/admin/*` 这类目录

## Conflict Triage
同步上游如果出现冲突，按下面顺序看：

1. 先看前端边界层
- `frontend/src/app/workspace/*`
- `frontend/src/components/workspace/*`
- `frontend/src/app/api/app/*`

处理原则：
- 优先保留我方平台路由、权限、租户逻辑
- 再吸收上游的通用修复

2. 再看 Docker / 脚本 / 配置
- `docker/*`
- `scripts/*`
- `Makefile`

处理原则：
- 优先保留当前可运行的本地开发模式
- 再评估是否吃进上游环境修复

3. 最后才看 harness 核心
- `backend/packages/harness/deerflow/*`

处理原则：
- 默认优先跟上游
- 只有在我方业务必须依赖时才保留自定义改动
- 如果要改 harness，单独记录原因

4. 冲突处理完后必须做的事
- `git diff --check`
- 跑核心测试或最小可运行验证
- 打开关键页面确认没有明显回归

## Recommended Git Config
建议本机打开冲突复用能力：

```bash
git config rerere.enabled true
```

## Current Status
截至目前，这个本地仓库仍然是：
- `origin = https://github.com/martinmaaaa/deer-flow.git`
- `upstream = https://github.com/bytedance/deer-flow.git`

当前远端保留：
- `origin/main`：你的产品主线
- `origin/archive/pre-platform-reset-20260402-095113`：切换前的远端备份
