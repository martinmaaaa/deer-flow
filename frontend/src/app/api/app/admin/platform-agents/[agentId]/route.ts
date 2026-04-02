import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/platform/auth";
import { updatePlatformAgent } from "@/server/platform/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { agentId } = await params;
    const body = (await request.json()) as {
      name: string;
      description: string;
      category: string;
      model?: string | null;
      tool_groups?: string[];
      skills?: string[] | null;
      soul?: string;
      is_active?: boolean;
    };
    await updatePlatformAgent(agentId, {
      name: body.name,
      description: body.description,
      category: body.category,
      model: body.model ?? null,
      tool_groups: body.tool_groups ?? [],
      skills: body.skills ?? null,
      soul: body.soul ?? "",
      is_active: body.is_active ?? true,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to update platform agent" },
      { status: 400 },
    );
  }
}
