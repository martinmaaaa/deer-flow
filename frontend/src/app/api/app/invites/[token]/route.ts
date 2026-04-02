import { NextResponse } from "next/server";

import { getInviteByToken } from "@/server/platform/service";
import { ensurePlatformSetup } from "@/server/platform/setup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  await ensurePlatformSetup();
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ detail: "Invite not found" }, { status: 404 });
  }
  return NextResponse.json({ invite });
}
