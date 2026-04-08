import { cookies } from "next/headers";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requirePlatformAdmin } from "@/server/platform/auth";

function parseSidebarOpenCookie(
  value: string | undefined,
): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformAdmin();
  const cookieStore = await cookies();
  const initialSidebarOpen = parseSidebarOpenCookie(
    cookieStore.get("sidebar_state")?.value,
  );

  return (
    <WorkspaceShell initialSidebarOpen={initialSidebarOpen}>
      {children}
    </WorkspaceShell>
  );
}
