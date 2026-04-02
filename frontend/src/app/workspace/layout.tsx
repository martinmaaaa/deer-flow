import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireSession } from "@/server/platform/auth";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession();
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
