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

    const body = (await request.json()) as {
      text?: string;
      context?: Record<string, unknown>;
    };
    if (!body.text?.trim()) {
      return NextResponse.json({ detail: "text is required" }, { status: 400 });
    }

    const upstream = await fetch(`${gatewayBaseUrl()}/api/runs/wait`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistant_id: "lead_agent",
        input: {
          messages: [
            {
              role: "user",
              content: body.text.trim(),
            },
          ],
        },
        config: {
          configurable: {
            thread_id: threadId,
            agent_name: thread.runtime_agent_name,
            ...(body.context ?? {}),
          },
        },
      }),
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to send message" },
      { status: 400 },
    );
  }
}
