import { NextResponse } from "next/server";

import { env } from "@/env";
import { requireCompanyMember } from "@/server/platform/auth";
import { getThreadForUser, touchThreadTitle } from "@/server/platform/service";

function gatewayBaseUrl() {
  return (
    env.DEER_FLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    env.DEERFLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    "http://127.0.0.1:3026"
  );
}

function buildProxyUrl(path: string, search: string) {
  return `${gatewayBaseUrl()}/api/${path}${search}`;
}

async function handleProxy(
  request: Request,
  params: Promise<{ path: string[] }>,
) {
  const { session } = await requireCompanyMember();
  const { path } = await params;
  const pathname = path.join("/");

  if (pathname === "threads" && request.method === "POST") {
    return NextResponse.json(
      { detail: "Create threads via /api/app/threads" },
      { status: 400 },
    );
  }

  if (pathname === "threads/search") {
    return NextResponse.json(
      { detail: "Search threads via /api/app/threads" },
      { status: 400 },
    );
  }

  const threadMatch = /^threads\/([^/]+)/.exec(pathname);
  if (threadMatch) {
    const threadId = decodeURIComponent(threadMatch[1] ?? "");
    const thread = await getThreadForUser(session.user.id, threadId);
    if (!thread) {
      return NextResponse.json({ detail: "Thread not found" }, { status: 404 });
    }
  }

  const upstream = await fetch(
    buildProxyUrl(pathname, new URL(request.url).search),
    {
      method: request.method,
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        accept: request.headers.get("accept") ?? "*/*",
      },
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
    },
  );

  if (
    threadMatch &&
    upstream.ok &&
    upstream.headers.get("content-type")?.includes("application/json")
  ) {
    try {
      const cloned = upstream.clone();
      const payload = (await cloned.json()) as {
        values?: { title?: string };
      };
      const title = payload.values?.title;
      if (title) {
        await touchThreadTitle(decodeURIComponent(threadMatch[1] ?? ""), title);
      }
    } catch {
      // Ignore best-effort title sync failures.
    }
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const contentLocation = upstream.headers.get("content-location");
  if (contentLocation) {
    headers.set("content-location", contentLocation.replace(/^\/api\//, "/api/app/langgraph/"));
  }
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }
  const connection = upstream.headers.get("connection");
  if (connection) {
    headers.set("connection", connection);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleProxy(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleProxy(request, params);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleProxy(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleProxy(request, params);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleProxy(request, params);
}
