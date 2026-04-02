"use client";

import {
  Bot,
  Building2,
  KeyRound,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Skill } from "@/core/skills/type";

type Company = {
  id: string;
  slug: string;
  name: string;
  member_count: string;
  granted_count: string;
};

type PlatformAgent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  model: string | null;
  tool_groups: string[];
  skills: string[] | null;
  soul: string;
  is_active: boolean;
};

type CompanyDetail = {
  company: { id: string; name: string; slug: string };
  members: Array<{ user_id: string; email: string; name: string | null }>;
  invites: Array<{ id: string; email: string; token: string; accepted_at: string | null }>;
  grants: Array<{
    platform_agent_id: string;
    slug: string;
    name: string;
    description: string;
    enabled: boolean;
    runtime_agent_name: string;
  }>;
};

export type AdminSectionKey = "companies" | "members" | "agents" | "access";

const ADMIN_SECTIONS: Array<{
  key: AdminSectionKey;
  title: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    key: "companies",
    title: "公司管理",
    description: "创建和查看平台里的企业租户。",
    icon: Building2,
  },
  {
    key: "members",
    title: "成员与邀请",
    description: "向选中的公司发放邀请码，查看成员状态。",
    icon: Users,
  },
  {
    key: "agents",
    title: "平台智能体",
    description: "管理平台统一提供的智能体目录与基础配置。",
    icon: Bot,
  },
  {
    key: "access",
    title: "授权配置",
    description: "为选中的公司勾选可用智能体并生成 runtime agent。",
    icon: KeyRound,
  },
];

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => ({}))) as T & {
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(data.detail ?? "Request failed");
  }
  return data;
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-12 text-center text-sm">
        <div className="font-medium text-foreground">{title}</div>
        <div className="mt-1">{description}</div>
      </CardContent>
    </Card>
  );
}

const ADMIN_SELECTED_COMPANY_KEY = "admin_selected_company_id";

export function AdminConsole({
  section,
}: {
  section: AdminSectionKey;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [platformAgents, setPlatformAgents] = useState<PlatformAgent[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<CompanyDetail | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [newAgent, setNewAgent] = useState({
    slug: "",
    name: "",
    category: "内容创作",
    description: "",
    model: "deepseek-chat",
    tool_groups: "",
    skills: [] as string[],
    soul: "",
  });
  const [grantSelection, setGrantSelection] = useState<Record<string, boolean>>({});

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const selectedSection = useMemo(
    () => ADMIN_SECTIONS.find((item) => item.key === section) ?? ADMIN_SECTIONS[0]!,
    [section],
  );

  const loadBase = useCallback(async () => {
    const [companyRes, agentRes, skillRes] = await Promise.all([
      api<{ companies: Company[] }>("/api/app/admin/companies"),
      api<{ agents: PlatformAgent[] }>("/api/app/admin/platform-agents"),
      api<{ skills: Skill[] }>("/api/skills"),
    ]);
    setCompanies(companyRes.companies);
    setPlatformAgents(agentRes.agents);
    setAvailableSkills(skillRes.skills);
    if (!selectedCompanyId) {
      const storedCompanyId =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(ADMIN_SELECTED_COMPANY_KEY);
      const preferredCompany = companyRes.companies.find(
        (company) => company.id === storedCompanyId,
      );
      if (preferredCompany) {
        setSelectedCompanyId(preferredCompany.id);
      } else if (companyRes.companies[0]) {
        setSelectedCompanyId(companyRes.companies[0].id);
      }
    }
  }, [selectedCompanyId]);

  const loadCompanyDetail = useCallback(async (companyId: string) => {
    const detail = await api<CompanyDetail>(`/api/app/admin/companies/${companyId}`);
    setSelectedCompanyDetail(detail);
    const selection: Record<string, boolean> = {};
    for (const grant of detail.grants) {
      selection[grant.platform_agent_id] = grant.enabled;
    }
    setGrantSelection(selection);
  }, []);

  useEffect(() => {
    void loadBase().catch((error) => toast.error(error.message));
  }, [loadBase]);

  useEffect(() => {
    if (selectedCompanyId) {
      window.localStorage.setItem(ADMIN_SELECTED_COMPANY_KEY, selectedCompanyId);
      void loadCompanyDetail(selectedCompanyId).catch((error) =>
        toast.error(error.message),
      );
    } else {
      setSelectedCompanyDetail(null);
      setGrantSelection({});
    }
  }, [loadCompanyDetail, selectedCompanyId]);

  const createCompany = useCallback(async () => {
    try {
      await api("/api/app/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName }),
      });
      setCompanyName("");
      await loadBase();
      toast.success("公司已创建");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  }, [companyName, loadBase]);

  const createPlatformAgent = useCallback(async () => {
    const parsedToolGroups = parseCommaSeparatedList(newAgent.tool_groups);

    try {
      await api("/api/app/admin/platform-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newAgent.slug,
          name: newAgent.name,
          category: newAgent.category,
          description: newAgent.description,
          model: newAgent.model,
          tool_groups: parsedToolGroups,
          skills: newAgent.skills,
          soul: newAgent.soul,
        }),
      });
      setNewAgent({
        slug: "",
        name: "",
        category: "内容创作",
        description: "",
        model: "deepseek-chat",
        tool_groups: "",
        skills: [],
        soul: "",
      });
      await loadBase();
      if (selectedCompanyId) {
        await loadCompanyDetail(selectedCompanyId);
      }
      toast.success("智能体已创建");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  }, [loadBase, loadCompanyDetail, newAgent, selectedCompanyId]);

  const createInvite = useCallback(async () => {
    if (!selectedCompany) {
      return;
    }
    try {
      const result = await api<{ inviteUrl: string }>(
        `/api/app/admin/companies/${selectedCompany.id}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail }),
        },
      );
      setInviteEmail("");
      await loadCompanyDetail(selectedCompany.id);
      await navigator.clipboard.writeText(
        `${window.location.origin}${result.inviteUrl}`,
      );
      toast.success("邀请码已创建并复制");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建邀请码失败");
    }
  }, [inviteEmail, loadCompanyDetail, selectedCompany]);

  const saveGrants = useCallback(async () => {
    if (!selectedCompany) {
      return;
    }
    try {
      await api(`/api/app/admin/companies/${selectedCompany.id}/grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformAgentIds: Object.entries(grantSelection)
            .filter(([, checked]) => checked)
            .map(([id]) => id),
        }),
      });
      await loadCompanyDetail(selectedCompany.id);
      await loadBase();
      toast.success("授权已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存授权失败");
    }
  }, [grantSelection, loadBase, loadCompanyDetail, selectedCompany]);

  const toggleSkillSelection = useCallback((skillName: string, checked: boolean) => {
    setNewAgent((prev) => {
      if (checked) {
        if (prev.skills.includes(skillName)) {
          return prev;
        }
        return {
          ...prev,
          skills: [...prev.skills, skillName],
        };
      }

      return {
        ...prev,
        skills: prev.skills.filter((name) => name !== skillName),
      };
    });
  }, []);

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">平台后台</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          公司、成员、平台智能体与授权配置
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <section className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{selectedSection.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {selectedSection.description}
              </p>
            </div>
            {selectedCompany && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedCompany.name}</Badge>
                <Badge variant="outline">{selectedCompany.slug}</Badge>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {section === "companies" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>创建公司</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 md:flex-row">
                    <Input
                      placeholder="公司名称"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                    />
                    <Button className="md:w-36" onClick={createCompany}>
                      创建公司
                    </Button>
                  </CardContent>
                </Card>

                {selectedCompany && selectedCompanyDetail ? (
                  <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <Card className="min-h-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Building2 className="h-4 w-4" />
                          公司上下文
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-xl border px-3 py-3">
                          <div className="font-medium">{selectedCompany.name}</div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {selectedCompany.slug}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              成员 {selectedCompany.member_count}
                            </Badge>
                            <Badge variant="outline">
                              已授权 {selectedCompany.granted_count}
                            </Badge>
                          </div>
                        </div>

                        <ScrollArea className="h-72">
                          <div className="space-y-2 pr-3">
                            {companies.map((company) => (
                              <button
                                key={company.id}
                                className={`hover:bg-muted/50 w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                                  company.id === selectedCompanyId
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                                }`}
                                onClick={() => setSelectedCompanyId(company.id)}
                                type="button"
                              >
                                <div className="font-medium">{company.name}</div>
                                <div className="text-muted-foreground mt-1 text-xs">
                                  成员 {company.member_count} · 已授权 {company.granted_count}
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {selectedCompany.name}
                          <Badge variant="secondary">{selectedCompany.slug}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border p-4">
                          <div className="text-muted-foreground text-sm">成员数</div>
                          <div className="mt-2 text-2xl font-semibold">
                            {selectedCompany.member_count}
                          </div>
                        </div>
                        <div className="rounded-xl border p-4">
                          <div className="text-muted-foreground text-sm">已授权智能体</div>
                          <div className="mt-2 text-2xl font-semibold">
                            {selectedCompany.granted_count}
                          </div>
                        </div>
                        <div className="rounded-xl border p-4">
                          <div className="text-muted-foreground text-sm">待接受邀请码</div>
                          <div className="mt-2 text-2xl font-semibold">
                            {
                              selectedCompanyDetail.invites.filter(
                                (invite) => !invite.accepted_at,
                              ).length
                            }
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <EmptyPanel
                    title="请选择一家公司"
                    description="左侧选中企业后，这里会显示租户概览。"
                  />
                )}
              </>
            )}

            {section === "members" &&
              (selectedCompany && selectedCompanyDetail ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>创建邀请码</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 md:flex-row">
                      <Input
                        placeholder="成员邮箱"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                      />
                      <Button className="md:w-40" onClick={createInvite}>
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        创建邀请码
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {selectedCompany.name}
                          <Badge variant="secondary">{selectedCompany.slug}</Badge>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>成员</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedCompanyDetail.members.map((member) => (
                          <div key={member.user_id} className="rounded-lg border p-3">
                            <div className="font-medium">
                              {member.name ?? member.email}
                            </div>
                            <div className="text-muted-foreground mt-1 text-xs">
                              {member.email}
                            </div>
                          </div>
                        ))}
                        {selectedCompanyDetail.members.length === 0 && (
                          <div className="text-muted-foreground text-sm">
                            暂无成员
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>邀请码</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedCompanyDetail.invites.map((invite) => (
                          <div key={invite.id} className="rounded-lg border p-3">
                            <div className="font-medium">{invite.email}</div>
                            <div className="text-muted-foreground mt-1 text-xs">
                              {invite.accepted_at ? "已接受" : "待接受"}
                            </div>
                          </div>
                        ))}
                        {selectedCompanyDetail.invites.length === 0 && (
                          <div className="text-muted-foreground text-sm">
                            暂无邀请码
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <EmptyPanel
                  title="请选择一家公司"
                  description="成员和邀请码都依赖当前选中的企业租户。"
                />
              ))}

            {section === "agents" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>新建平台智能体</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-muted-foreground text-sm">
                      当前已创建 {platformAgents.length} 个平台智能体
                    </div>
                    <Input
                      placeholder="slug"
                      value={newAgent.slug}
                      onChange={(event) =>
                        setNewAgent((prev) => ({ ...prev, slug: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="名称"
                      value={newAgent.name}
                      onChange={(event) =>
                        setNewAgent((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="分类"
                        value={newAgent.category}
                        onChange={(event) =>
                          setNewAgent((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="模型"
                        value={newAgent.model}
                        onChange={(event) =>
                          setNewAgent((prev) => ({ ...prev, model: event.target.value }))
                        }
                      />
                    </div>
                    <Input
                      placeholder="tool_groups，逗号分隔"
                      value={newAgent.tool_groups}
                      onChange={(event) =>
                        setNewAgent((prev) => ({
                          ...prev,
                          tool_groups: event.target.value,
                        }))
                      }
                    />
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="text-sm font-medium">Skills</div>
                      <div className="text-muted-foreground text-xs">
                        勾选后会作为这个智能体的 skills 白名单写入 runtime agent；不勾选就不会绑定任何 skills。
                      </div>
                      {availableSkills.length === 0 ? (
                        <div className="text-muted-foreground text-sm">
                          当前没有可绑定的 skills。
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {availableSkills.map((skill) => (
                            <label
                              key={skill.name}
                              className="flex items-start gap-3 rounded-lg border p-3"
                            >
                              <input
                                type="checkbox"
                                checked={newAgent.skills.includes(skill.name)}
                                onChange={(event) =>
                                  toggleSkillSelection(skill.name, event.target.checked)
                                }
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{skill.name}</span>
                                  <Badge variant="outline">{skill.category}</Badge>
                                  {!skill.enabled && (
                                    <Badge variant="secondary">未启用</Badge>
                                  )}
                                </div>
                                <div className="text-muted-foreground mt-1 text-xs">
                                  {skill.description}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                      <div className="text-muted-foreground text-xs">
                        已选择 {newAgent.skills.length} 个 skills。
                      </div>
                    </div>
                    <Textarea
                      placeholder="描述"
                      value={newAgent.description}
                      onChange={(event) =>
                        setNewAgent((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                    />
                    <Textarea
                      placeholder="SOUL"
                      className="min-h-32"
                      value={newAgent.soul}
                      onChange={(event) =>
                        setNewAgent((prev) => ({ ...prev, soul: event.target.value }))
                      }
                    />
                    <Button className="w-full md:w-40" onClick={createPlatformAgent}>
                      新建平台智能体
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>已上架智能体</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {platformAgents.map((agent) => {
                        const boundSkills = agent.skills ?? [];
                        return (
                          <div key={agent.id} className="rounded-xl border p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">{agent.name}</div>
                              <Badge variant="secondary">{agent.category}</Badge>
                              {agent.model && (
                                <Badge variant="outline">{agent.model}</Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground mt-2 text-sm">
                              {agent.description || "暂无描述"}
                            </div>
                            <div className="text-muted-foreground mt-3 text-xs">
                              slug: {agent.slug}
                            </div>
                            {agent.tool_groups.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {agent.tool_groups.map((group) => (
                                  <Badge key={group} variant="outline">
                                    {group}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {boundSkills.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {boundSkills.map((skill) => (
                                  <Badge key={skill} variant="secondary">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {boundSkills.length === 0 && (
                              <div className="text-muted-foreground mt-3 text-xs">
                                当前未绑定 skills
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {section === "access" &&
              (selectedCompany && selectedCompanyDetail ? (
                <Card>
                  <CardHeader>
                    <CardTitle>智能体授权</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      {selectedCompanyDetail.grants.map((grant) => (
                        <label
                          key={grant.platform_agent_id}
                          className="flex items-start gap-3 rounded-xl border p-4"
                        >
                          <input
                            type="checkbox"
                            checked={!!grantSelection[grant.platform_agent_id]}
                            onChange={(event) =>
                              setGrantSelection((prev) => ({
                                ...prev,
                                [grant.platform_agent_id]: event.target.checked,
                              }))
                            }
                          />
                          <div className="min-w-0">
                            <div className="font-medium">{grant.name}</div>
                            <div className="text-muted-foreground mt-1 text-sm">
                              {grant.description}
                            </div>
                            {grant.enabled && grant.runtime_agent_name && (
                              <div className="text-muted-foreground mt-2 text-xs">
                                runtime: {grant.runtime_agent_name}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button onClick={saveGrants}>保存授权</Button>
                  </CardContent>
                </Card>
              ) : (
                <EmptyPanel
                  title="请选择一家公司"
                  description="左侧选中企业后，再为它分配平台智能体。"
                />
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
