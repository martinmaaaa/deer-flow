import { NextResponse } from "next/server";

import { requireCompanyMember } from "@/server/platform/auth";
import { deleteThreadForUser, getThreadForUser, renameThreadForUser } from "@/server/platform/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { session } = await requireCompanyMember();
    const { threadId } = await params;
    const thread = await getThreadForUser(session.user.id, threadId);
    if (!thread) {
      return NextResponse.json({ detail: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { session } = await requireCompanyMember();
    const { threadId } = await params;
    const body = (await request.json()) as { title?: string };
    if (!body.title?.trim()) {
      return NextResponse.json({ detail: "title is required" }, { status: 400 });
    }
    await renameThreadForUser(session.user.id, threadId, body.title.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to update thread" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { session } = await requireCompanyMember();
    const { threadId } = await params;
    await deleteThreadForUser(session.user.id, threadId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to delete thread" },
      { status: 400 },
    );
  }
}
