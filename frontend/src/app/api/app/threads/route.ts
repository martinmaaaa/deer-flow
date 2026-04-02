import { NextResponse } from "next/server";

import { requireCompanyMember } from "@/server/platform/auth";
import { createThreadForUser, listThreadsForUser } from "@/server/platform/service";

export async function GET() {
  try {
    const { session } = await requireCompanyMember();
    const threads = await listThreadsForUser(session.user.id);
    return NextResponse.json(threads);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireCompanyMember();
    const body = (await request.json()) as { agentSlug?: string };
    if (!body.agentSlug) {
      return NextResponse.json(
        { detail: "agentSlug is required" },
        { status: 400 },
      );
    }

    const created = await createThreadForUser(session.user.id, body.agentSlug);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to create thread" },
      { status: 400 },
    );
  }
}
