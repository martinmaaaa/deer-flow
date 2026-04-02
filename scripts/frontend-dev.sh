#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

if [ -f "$PROJECT_ROOT/frontend/.env" ]; then
    set -a
    source "$PROJECT_ROOT/frontend/.env"
    set +a
fi

export BETTER_AUTH_BASE_URL="${BETTER_AUTH_BASE_URL:-http://localhost:3026}"
export DATABASE_URL="${DATABASE_URL:-postgresql://deerflow:deerflow@127.0.0.1:55432/deerflow}"
export PLATFORM_ADMIN_EMAILS="${PLATFORM_ADMIN_EMAILS:-admin@local.deerflow}"
export PLATFORM_BOOTSTRAP_ADMIN_EMAIL="${PLATFORM_BOOTSTRAP_ADMIN_EMAIL:-admin@local.deerflow}"
export PLATFORM_BOOTSTRAP_ADMIN_NAME="${PLATFORM_BOOTSTRAP_ADMIN_NAME:-Platform Admin}"
export PLATFORM_BOOTSTRAP_ADMIN_PASSWORD="${PLATFORM_BOOTSTRAP_ADMIN_PASSWORD:-deerflow-platform-admin}"
export DEER_FLOW_INTERNAL_GATEWAY_BASE_URL="${DEER_FLOW_INTERNAL_GATEWAY_BASE_URL:-http://127.0.0.1:3026}"
export DEER_FLOW_INTERNAL_LANGGRAPH_BASE_URL="${DEER_FLOW_INTERNAL_LANGGRAPH_BASE_URL:-http://127.0.0.1:3026/api/langgraph}"

mkdir -p "$PROJECT_ROOT/logs"

echo "=========================================="
echo "  Starting DeerFlow Frontend on Host"
echo "=========================================="
echo ""
echo "  Frontend dev server: http://localhost:3000"
echo "  Public app URL:      http://localhost:3026"
echo "  Gateway via nginx:   http://localhost:3026/api/*"
echo ""
echo "  Using DATABASE_URL=$DATABASE_URL"
echo "  Using BETTER_AUTH_BASE_URL=$BETTER_AUTH_BASE_URL"
echo ""

cd "$PROJECT_ROOT/frontend"
pnpm run dev 2>&1 | tee "$PROJECT_ROOT/logs/frontend-host.log"
