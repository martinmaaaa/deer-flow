import { useQuery } from "@tanstack/react-query";

import {
  getPlatformAgent,
  getWorkspaceSession,
  listMyAgents,
  listStoreAgents,
} from "./api";

export function useStoreAgents() {
  const query = useQuery({
    queryKey: ["platform-agents", "store"],
    queryFn: listStoreAgents,
  });
  return {
    agents: query.data?.agents ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useMyPlatformAgents() {
  const query = useQuery({
    queryKey: ["platform-agents", "my"],
    queryFn: listMyAgents,
  });
  return {
    agents: query.data?.agents ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function usePlatformAgent(slug: string | null | undefined) {
  const query = useQuery({
    queryKey: ["platform-agents", slug],
    queryFn: () => getPlatformAgent(slug!),
    enabled: !!slug,
  });
  return {
    agent: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useWorkspaceSession() {
  const query = useQuery({
    queryKey: ["workspace-session"],
    queryFn: getWorkspaceSession,
    staleTime: 60_000,
  });

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
