import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/server/platform/auth";
import { getCompanyAdminDetail } from "@/server/platform/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { companyId } = await params;
    const detail = await getCompanyAdminDetail(companyId);
    if (!detail) {
      return NextResponse.json({ detail: "Company not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
