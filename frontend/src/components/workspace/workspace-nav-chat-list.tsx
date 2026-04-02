"use client";

import {
  BotIcon,
  Building2,
  KeyRound,
  LayoutPanelTop,
  MessagesSquare,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useWorkspaceSession } from "@/core/platform/hooks";

export function WorkspaceNavChatList() {
  const pathname = usePathname();
  const { session } = useWorkspaceSession();
  const hasCompanyWorkspace = !!session?.company;
  const showAdminEntry = !!session?.isPlatformAdmin;

  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        {showAdminEntry && (
          <>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={pathname.startsWith("/admin")} asChild>
                <Link className="text-muted-foreground" href="/admin/companies">
                  <LayoutPanelTop />
                  <span>平台后台</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/companies")}
                asChild
              >
                <Link className="text-muted-foreground" href="/admin/companies">
                  <Building2 />
                  <span>公司管理</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/members")}
                asChild
              >
                <Link className="text-muted-foreground" href="/admin/members">
                  <Users />
                  <span>成员与邀请</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/platform-agents")}
                asChild
              >
                <Link
                  className="text-muted-foreground"
                  href="/admin/platform-agents"
                >
                  <BotIcon />
                  <span>平台智能体</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/access")}
                asChild
              >
                <Link className="text-muted-foreground" href="/admin/access">
                  <KeyRound />
                  <span>授权配置</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        )}
        {hasCompanyWorkspace && (
          <>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/workspace/chats"}
                asChild
              >
                <Link className="text-muted-foreground" href="/workspace/chats">
                  <MessagesSquare />
                  <span>我的会话</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/workspace/agents")}
                asChild
              >
                <Link className="text-muted-foreground" href="/workspace/agents">
                  <BotIcon />
                  <span>智能体商店</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
