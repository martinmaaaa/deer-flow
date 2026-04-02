import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/platform/auth";
import { setCompanyAgentGrants } from "@/server/platform/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { companyId } = await params;
    const body = (await request.json()) as { platformAgentIds?: string[] };
    await setCompanyAgentGrants(companyId, body.platformAgentIds ?? []);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to update grants" },
      { status: 400 },
    );
  }
}
