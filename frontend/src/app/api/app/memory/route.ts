import { NextResponse } from "next/server";

import { requireCompanyMember } from "@/server/platform/auth";
import { getCompanyMemoryPreviewForUser } from "@/server/platform/service";

export async function GET() {
  try {
    const { session } = await requireCompanyMember();
    const preview = await getCompanyMemoryPreviewForUser(session.user.id);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
