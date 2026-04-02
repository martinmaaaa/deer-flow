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
