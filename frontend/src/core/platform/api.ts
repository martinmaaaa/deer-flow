import type {
  CompanyMemoryPreview,
  PlatformAgent,
  PlatformThreadCreateResult,
  WorkspaceSession,
} from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new Error(error.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function listStoreAgents() {
  const response = await fetch("/api/app/agents/store");
  return parseResponse<{ agents: PlatformAgent[] }>(response);
}

export async function listMyAgents() {
  const response = await fetch("/api/app/agents/my");
  return parseResponse<{ agents: PlatformAgent[] }>(response);
}

export async function getPlatformAgent(slug: string) {
  const response = await fetch(`/api/app/agents/${encodeURIComponent(slug)}`);
  return parseResponse<PlatformAgent>(response);
}

export async function createPlatformThread(agentSlug: string) {
  const response = await fetch("/api/app/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentSlug }),
  });
  return parseResponse<PlatformThreadCreateResult>(response);
}

export async function getWorkspaceSession() {
  const response = await fetch("/api/app/session");
  return parseResponse<WorkspaceSession>(response);
}

export async function getCompanyMemoryPreview() {
  const response = await fetch("/api/app/memory");
  return parseResponse<CompanyMemoryPreview>(response);
}
