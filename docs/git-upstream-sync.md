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

## Daily Development
开发新功能时固定这样做：

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature
```

完成后提 PR 合回 `main`。

## Sync Upstream
同步官方 DeerFlow 更新时固定这样做：

```bash
git fetch upstream
git checkout main
git pull origin main
git checkout -b sync/upstream-2026-04-02
git merge upstream/main
```

然后：
- 解决冲突
- 跑测试
- 本地验证页面和核心功能
- 提 PR 合回 `main`

## Rules
- 不要直接在 `main` 上开发
- 不要把“同步上游”和“业务开发”放在同一个分支
- 尽量少改 `backend/packages/harness/deerflow/*`
- 平台能力优先新增在 `frontend/src/server/platform/*`、`frontend/src/app/api/app/*`、`frontend/src/components/admin/*` 这类目录

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
