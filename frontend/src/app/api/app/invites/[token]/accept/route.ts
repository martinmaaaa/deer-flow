import { NextResponse } from "next/server";

import { requireSession } from "@/server/platform/auth";
import { acceptInviteForUser } from "@/server/platform/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await requireSession();
    const { token } = await params;
    await acceptInviteForUser(token, session.user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to accept invite" },
      { status: 400 },
    );
  }
}
