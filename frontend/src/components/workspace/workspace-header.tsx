"use client";

import { Building2, LayoutPanelTop, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspaceSession } from "@/core/platform/hooks";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { session } = useWorkspaceSession();
  const companyName = session?.company?.name ?? null;
  const adminOnly = !!session?.isPlatformAdmin && !session?.company;
  const title = adminOnly ? "平台后台" : "DeerFlow";
  const subtitle = adminOnly ? "运营与租户管理" : companyName;
  const primaryHref = adminOnly ? "/admin/companies" : "/workspace/agents";
  const primaryLabel = adminOnly ? "平台后台" : "开始新对话";
  const primaryActive = adminOnly
    ? pathname.startsWith("/admin")
    : pathname === "/workspace/agents";
  const PrimaryIcon = adminOnly ? LayoutPanelTop : MessageSquarePlus;

  return (
    <>
      <div
        className={cn(
          "group/workspace-header flex h-12 flex-col justify-center",
          className,
        )}
      >
        {state === "collapsed" ? (
          <div className="group-has-data-[collapsible=icon]/sidebar-wrapper:-translate-y flex w-full cursor-pointer items-center justify-center">
            <div className="text-primary block pt-1 font-serif group-hover/workspace-header:hidden">
              DF
            </div>
            <SidebarTrigger className="hidden pl-2 group-hover/workspace-header:block" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
              <Link href="/" className="ml-2 min-w-0">
                <div className="text-primary font-serif">{title}</div>
                {subtitle && (
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{subtitle}</span>
                  </div>
                )}
              </Link>
            ) : (
              <div className="ml-2 min-w-0 cursor-default">
                <div className="text-primary font-serif">{title}</div>
                {subtitle && (
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{subtitle}</span>
                  </div>
                )}
              </div>
            )}
            <SidebarTrigger />
          </div>
        )}
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={primaryActive}
            asChild
          >
            <Link className="text-muted-foreground" href={primaryHref}>
              <PrimaryIcon size={16} />
              <span>{primaryLabel}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
