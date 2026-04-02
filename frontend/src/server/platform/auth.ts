import { redirect } from "next/navigation";

import { env } from "@/env";
import { getSession } from "@/server/better-auth/server";

import {
  ensureUserProfileForSession,
  getCompanyMembershipByUserId,
  getPlatformUserProfile,
} from "./service";
import { ensurePlatformSetup } from "./setup";

function getAdminEmailAllowlist() {
  return new Set(
    (env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireSession() {
  await ensurePlatformSetup();
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  await ensureUserProfileForSession(session.user);
  return session;
}

export async function requireCompanyMember() {
  const session = await requireSession();
  const membership = await getCompanyMembershipByUserId(session.user.id);
  if (!membership) {
    redirect("/sign-in?reason=no-company");
  }
  return { session, membership };
}

export async function requirePlatformAdmin() {
  const session = await requireSession();
  const profile = await getPlatformUserProfile(session.user.id);
  const isAdmin =
    profile?.platform_role === "platform_admin" ||
    getAdminEmailAllowlist().has(session.user.email.toLowerCase());

  if (!isAdmin) {
    redirect("/workspace");
  }

  return { session, profile };
}
