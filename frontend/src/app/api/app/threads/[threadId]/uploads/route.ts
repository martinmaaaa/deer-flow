import { NextResponse } from "next/server";

import { env } from "@/env";
import { requireCompanyMember } from "@/server/platform/auth";
import { getThreadForUser } from "@/server/platform/service";

function gatewayBaseUrl() {
  return (
    env.DEER_FLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    env.DEERFLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    "http://127.0.0.1:2026"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { session } = await requireCompanyMember();
    const { threadId } = await params;
    const thread = await getThreadForUser(session.user.id, threadId);
    if (!thread) {
      return NextResponse.json({ detail: "Thread not found" }, { status: 404 });
    }

    const response = await fetch(
      `${gatewayBaseUrl()}/api/threads/${threadId}/uploads`,
      {
        method: "POST",
        headers: {
          "content-type": request.headers.get("content-type") ?? "",
        },
        body: await request.arrayBuffer(),
      },
    );

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
