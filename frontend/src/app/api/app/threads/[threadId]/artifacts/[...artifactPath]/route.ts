import { NextResponse } from "next/server";

import { env } from "@/env";
import { requireCompanyMember } from "@/server/platform/auth";
import { getThreadForUser } from "@/server/platform/service";

function gatewayBaseUrl() {
  return (
    env.DEER_FLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    env.DEERFLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    "http://127.0.0.1:3026"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string; artifactPath?: string[] }> },
) {
  try {
    const { session } = await requireCompanyMember();
    const { threadId, artifactPath = [] } = await params;
    const thread = await getThreadForUser(session.user.id, threadId);
    if (!thread) {
      return NextResponse.json({ detail: "Thread not found" }, { status: 404 });
    }

    const pathname = artifactPath.join("/");
    const search = new URL(request.url).search;
    const response = await fetch(
      `${gatewayBaseUrl()}/api/threads/${threadId}/artifacts/${pathname}${search}`,
    );

    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      headers.set("content-disposition", disposition);
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Artifact request failed" },
      { status: 400 },
    );
  }
}
