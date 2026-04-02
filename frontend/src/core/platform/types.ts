export interface PlatformAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  model: string | null;
  tool_groups: string[];
  soul: string;
  is_active: boolean;
  granted: boolean;
  runtime_agent_name: string | null;
}

export interface PlatformThreadCreateResult {
  threadId: string;
  runtimeAgentName: string;
  agent: PlatformAgent;
}

export interface WorkspaceCompany {
  id: string;
  name: string;
  slug: string;
}

export interface CompanyMemorySourceAgent {
  agentSlug: string;
  agentName: string;
  runtimeAgentName: string;
}

export interface CompanyMemoryPreviewSectionSource
  extends CompanyMemorySourceAgent {
  summary: string;
  updatedAt: string;
}

export interface CompanyMemoryPreviewSection {
  summary: string;
  updatedAt: string;
  sources: CompanyMemoryPreviewSectionSource[];
}

export interface CompanyMemoryPreviewFact {
  id: string;
  content: string;
  category: string;
  confidence: number;
  createdAt: string;
  source: string;
  sourceError?: string | null;
  agentSlug: string;
  agentName: string;
  runtimeAgentName: string;
}

export interface CompanyMemoryPreview {
  scope: "company";
  company: WorkspaceCompany;
  sourceAgents: CompanyMemorySourceAgent[];
  lastUpdated: string;
  sections: {
    workContext: CompanyMemoryPreviewSection;
    personalContext: CompanyMemoryPreviewSection;
    topOfMind: CompanyMemoryPreviewSection;
    recentMonths: CompanyMemoryPreviewSection;
    earlierContext: CompanyMemoryPreviewSection;
    longTermBackground: CompanyMemoryPreviewSection;
  };
  facts: CompanyMemoryPreviewFact[];
}

export interface WorkspaceSessionUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface WorkspaceSession {
  user: WorkspaceSessionUser;
  isPlatformAdmin: boolean;
  company: WorkspaceCompany | null;
}
