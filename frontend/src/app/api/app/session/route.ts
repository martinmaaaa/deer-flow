import { NextResponse } from "next/server";

import { env } from "@/env";
import { requireSession } from "@/server/platform/auth";
import {
  getCompanyMembershipByUserId,
  getPlatformUserProfile,
} from "@/server/platform/service";

function getAdminAllowlist() {
  return new Set(
    (env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await getPlatformUserProfile(session.user.id);
    const membership = await getCompanyMembershipByUserId(session.user.id);
    const isPlatformAdmin =
      profile?.platform_role === "platform_admin" ||
      getAdminAllowlist().has(session.user.email.toLowerCase());

    return NextResponse.json({
      user: session.user,
      isPlatformAdmin,
      company: membership
        ? {
            id: membership.company_id,
            name: membership.company_name,
            slug: membership.company_slug,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { detail: "Unauthorized" },
      { status: 401 },
    );
  }
}
