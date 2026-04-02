import { NextResponse } from "next/server";

import { requireCompanyMember } from "@/server/platform/auth";
import { getGrantedAgentForUser, getStoreAgentForUser } from "@/server/platform/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { session } = await requireCompanyMember();
    const { slug } = await params;
    const agent = await getStoreAgentForUser(session.user.id, slug);
    if (!agent) {
      return NextResponse.json({ detail: "Agent not found" }, { status: 404 });
    }

    const grantedAgent = await getGrantedAgentForUser(session.user.id, slug);

    return NextResponse.json({
      ...agent,
      granted: !!grantedAgent,
      runtime_agent_name: grantedAgent?.runtime_agent_name ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
