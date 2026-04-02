import { NextResponse } from "next/server";

import { requireCompanyMember } from "@/server/platform/auth";
import { listGrantedAgentsForUser } from "@/server/platform/service";

export async function GET() {
  try {
    const { session } = await requireCompanyMember();
    const agents = await listGrantedAgentsForUser(session.user.id);
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
