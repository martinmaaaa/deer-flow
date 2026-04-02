import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/platform/auth";
import { createCompanyInvite } from "@/server/platform/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { session } = await requirePlatformAdmin();
    const { companyId } = await params;
    const body = (await request.json()) as { email?: string };
    if (!body.email?.trim()) {
      return NextResponse.json({ detail: "email is required" }, { status: 400 });
    }
    const invite = await createCompanyInvite(
      companyId,
      body.email,
      session.user.id,
    );
    return NextResponse.json({
      invite,
      inviteUrl: `/invite/${invite.token}`,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to create invite" },
      { status: 400 },
    );
  }
}
