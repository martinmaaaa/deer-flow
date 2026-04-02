import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requirePlatformAdmin } from "@/server/platform/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformAdmin();
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
