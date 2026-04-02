import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/platform/auth";
import { createCompany, listCompanies } from "@/server/platform/service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const companies = await listCompanies();
    return NextResponse.json({ companies });
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
    const body = (await request.json()) as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ detail: "name is required" }, { status: 400 });
    }
    const company = await createCompany(body.name);
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to create company" },
      { status: 400 },
    );
  }
}
