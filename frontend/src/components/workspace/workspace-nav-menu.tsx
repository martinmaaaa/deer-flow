"use client";

import {
  BugIcon,
  Building2,
  ChevronsUpDown,
  GlobeIcon,
  InfoIcon,
  MailIcon,
  LogOutIcon,
  ShieldCheck,
  Settings2Icon,
  SettingsIcon,
  User2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { useWorkspaceSession } from "@/core/platform/hooks";
import { authClient } from "@/server/better-auth/client";

import { GithubIcon } from "./github-icon";
import { SettingsDialog } from "./settings";

function NavMenuButtonContent({
  isSidebarOpen,
  t,
  companyName,
  displayName,
}: {
  isSidebarOpen: boolean;
  t: ReturnType<typeof useI18n>["t"];
  companyName?: string | null;
  displayName?: string | null;
}) {
  return isSidebarOpen ? (
    <div className="text-muted-foreground flex w-full items-center gap-2 text-left text-sm">
      <SettingsIcon className="size-4" />
        <div className="min-w-0">
          <div className="truncate text-sm">
          {companyName ?? t.workspace.settingsAndMore}
          </div>
          <div className="text-muted-foreground/80 truncate text-xs">
          {displayName ?? t.workspace.settingsAndMore}
          </div>
        </div>
      <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
    </div>
  ) : (
    <div className="flex size-full items-center justify-center">
      <SettingsIcon className="text-muted-foreground size-4" />
    </div>
  );
}

export function WorkspaceNavMenu() {
  const router = useRouter();
  const { session } = useWorkspaceSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDefaultSection, setSettingsDefaultSection] = useState<
    "appearance" | "memory" | "tools" | "skills" | "notification" | "about"
  >("appearance");
  const [mounted, setMounted] = useState(false);
  const { open: isSidebarOpen } = useSidebar();
  const { t } = useI18n();
  const companyName = session?.company?.name ?? null;
  const displayName =
    session?.user.name ??
    session?.user.email ??
    (session?.isPlatformAdmin ? "Platform Admin" : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultSection={settingsDefaultSection}
      />
      <SidebarMenu className="w-full">
        <SidebarMenuItem>
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <NavMenuButtonContent
                    isSidebarOpen={isSidebarOpen}
                    t={t}
                    companyName={
                      session?.isPlatformAdmin && !companyName
                        ? "平台后台"
                        : companyName
                    }
                    displayName={displayName}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  {companyName && (
                    <DropdownMenuItem disabled>
                      <Building2 />
                      {companyName}
                    </DropdownMenuItem>
                  )}
                  {displayName && (
                    <DropdownMenuItem disabled>
                      <User2 />
                      {displayName}
                    </DropdownMenuItem>
                  )}
                  {session?.isPlatformAdmin && (
                    <DropdownMenuItem
                      onClick={() => {
                        router.push("/admin/companies");
                        router.refresh();
                      }}
                    >
                      <ShieldCheck />
                      平台后台
                    </DropdownMenuItem>
                  )}
                  {(companyName ?? displayName ?? (session?.isPlatformAdmin ? "admin" : null)) && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setSettingsDefaultSection("appearance");
                      setSettingsOpen(true);
                    }}
                  >
                    <Settings2Icon />
                    {t.common.settings}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <a
                    href="https://deerflow.tech/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DropdownMenuItem>
                      <GlobeIcon />
                      {t.workspace.officialWebsite}
                    </DropdownMenuItem>
                  </a>
                  <a
                    href="https://github.com/bytedance/deer-flow"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DropdownMenuItem>
                      <GithubIcon />
                      {t.workspace.visitGithub}
                    </DropdownMenuItem>
                  </a>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await authClient.signOut();
                      router.push("/sign-in");
                      router.refresh();
                    }}
                  >
                    <LogOutIcon />
                    退出登录
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <a
                    href="https://github.com/bytedance/deer-flow/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DropdownMenuItem>
                      <BugIcon />
                      {t.workspace.reportIssue}
                    </DropdownMenuItem>
                  </a>
                  <a href="mailto:support@deerflow.tech">
                    <DropdownMenuItem>
                      <MailIcon />
                      {t.workspace.contactUs}
                    </DropdownMenuItem>
                  </a>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsDefaultSection("about");
                    setSettingsOpen(true);
                  }}
                >
                  <InfoIcon />
                  {t.workspace.about}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <NavMenuButtonContent isSidebarOpen={isSidebarOpen} t={t} />
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
