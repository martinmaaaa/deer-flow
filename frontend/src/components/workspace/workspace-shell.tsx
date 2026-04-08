"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/workspace/command-palette";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

const queryClient = new QueryClient();

export function WorkspaceShell({
  children,
  initialSidebarOpen,
}: Readonly<{
  children: React.ReactNode;
  initialSidebarOpen?: boolean;
}>) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider className="h-screen" defaultOpen={initialSidebarOpen}>
        <WorkspaceSidebar />
        <SidebarInset className="min-w-0">{children}</SidebarInset>
      </SidebarProvider>
      <CommandPalette />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
