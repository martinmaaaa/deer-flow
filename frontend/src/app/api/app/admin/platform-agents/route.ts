import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/platform/auth";
import { createPlatformAgent, listPlatformAgents } from "@/server/platform/service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const agents = await listPlatformAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = (await request.json()) as {
      slug: string;
      name: string;
      description?: string;
      category?: string;
      model?: string | null;
      tool_groups?: string[];
      soul?: string;
    };
    if (!body.slug || !body.name) {
      return NextResponse.json(
        { detail: "slug and name are required" },
        { status: 400 },
      );
    }
    const id = await createPlatformAgent({
      slug: body.slug,
      name: body.name,
      description: body.description ?? "",
      category: body.category ?? "通用",
      model: body.model ?? null,
      tool_groups: body.tool_groups ?? [],
      soul: body.soul ?? "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to create platform agent" },
      { status: 400 },
    );
  }
}
