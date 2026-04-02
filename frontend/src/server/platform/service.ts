import { createHash, randomBytes, randomUUID } from "crypto";

import type {
  CompanyMemoryPreview,
  CompanyMemoryPreviewFact,
  CompanyMemoryPreviewSection,
  CompanyMemoryPreviewSectionSource,
  CompanyMemorySourceAgent,
} from "@/core/platform/types";
import { env } from "@/env";
import type { Session } from "@/server/better-auth";

import { db } from "./db";

type JsonRecord = Record<string, unknown>;

export type PlatformUserProfile = {
  user_id: string;
  email: string;
  name: string | null;
  platform_role: string;
};

export type CompanyMembership = {
  membership_id: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  user_id: string;
  email: string;
};

export type PlatformAgentRecord = {
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

export type StoreAgentRecord = PlatformAgentRecord & {
  granted: boolean;
  runtime_agent_name: string | null;
};

export type ConversationThreadRecord = {
  thread_id: string;
  updated_at: string;
  created_at: string;
  title: string;
  status: string;
  metadata: JsonRecord;
  values: {
    title: string;
  };
};

type CompanyRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type InviteRecord = {
  id: string;
  company_id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  company_name?: string;
  company_slug?: string;
};

type MemorySectionKey =
  | "workContext"
  | "personalContext"
  | "topOfMind"
  | "recentMonths"
  | "earlierContext"
  | "longTermBackground";

type MemorySectionData = {
  summary: string;
  updatedAt: string;
};

type GatewayMemoryFact = {
  id: string;
  content: string;
  category: string;
  confidence: number;
  createdAt: string;
  source: string;
  sourceError?: string | null;
};

type GatewayMemoryResponse = {
  version: string;
  lastUpdated: string;
  user: {
    workContext: MemorySectionData;
    personalContext: MemorySectionData;
    topOfMind: MemorySectionData;
  };
  history: {
    recentMonths: MemorySectionData;
    earlierContext: MemorySectionData;
    longTermBackground: MemorySectionData;
  };
  facts: GatewayMemoryFact[];
};

const MEMORY_SECTION_KEYS: MemorySectionKey[] = [
  "workContext",
  "personalContext",
  "topOfMind",
  "recentMonths",
  "earlierContext",
  "longTermBackground",
];

function emptyPreviewSection(): CompanyMemoryPreviewSection {
  return {
    summary: "",
    updatedAt: "",
    sources: [],
  };
}

function getSectionData(
  memory: GatewayMemoryResponse,
  key: MemorySectionKey,
): MemorySectionData {
  switch (key) {
    case "workContext":
      return memory.user.workContext;
    case "personalContext":
      return memory.user.personalContext;
    case "topOfMind":
      return memory.user.topOfMind;
    case "recentMonths":
      return memory.history.recentMonths;
    case "earlierContext":
      return memory.history.earlierContext;
    case "longTermBackground":
      return memory.history.longTermBackground;
  }
}

function latestIsoTimestamp(values: Array<string | undefined | null>) {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .sort()
    .at(-1) ?? "";
}

function buildSectionSummary(sources: CompanyMemoryPreviewSectionSource[]) {
  return sources
    .map((source) => `### ${source.agentName}\n${source.summary.trim()}`)
    .join("\n\n");
}

function slugifyCompanyName(input: string) {
  const normalized = input.trim().toLowerCase();
  const asciiSlug = normalized
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (asciiSlug.length >= 3) {
    return asciiSlug;
  }

  const suffix = createHash("sha1")
    .update(normalized)
    .digest("hex")
    .slice(0, 8);

  const prefix = asciiSlug ? `company-${asciiSlug}` : "company";
  return `${prefix}-${suffix}`.slice(0, 48);
}

function parseToolGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function parseSkills(raw: unknown): string[] | null {
  if (raw === null || typeof raw === "undefined") {
    return null;
  }
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  return null;
}

function buildRuntimeAgentName(companySlug: string, platformAgentSlug: string) {
  return `${companySlug}--${platformAgentSlug}`.slice(0, 80);
}

function companyContextSoul(companyName: string, companySlug: string, baseSoul: string) {
  const prefix = `你当前服务的企业租户是「${companyName}」（company_slug: ${companySlug}）。\n请默认站在这家企业的业务语境下思考与输出，避免把其他企业的信息混入。`;
  return `${prefix}\n\n${baseSoul}`.trim();
}

function getGatewayBaseUrl() {
  return (
    env.DEER_FLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    env.DEERFLOW_INTERNAL_GATEWAY_BASE_URL?.replace(/\/+$/, "") ??
    "http://127.0.0.1:3026"
  );
}

async function gatewayFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${getGatewayBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || `Gateway request failed: ${response.status}`);
  }

  return response;
}

export async function ensureUserProfileForSession(user: Session["user"]) {
  await db.query(
    `
      INSERT INTO app_user_profiles (user_id, email, name, platform_role)
      VALUES ($1, $2, $3, COALESCE((SELECT platform_role FROM app_user_profiles WHERE user_id = $1), 'company_member'))
      ON CONFLICT (user_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW()
    `,
    [user.id, user.email, user.name ?? null],
  );
}

export async function getPlatformUserProfile(userId: string) {
  const { rows } = await db.query<PlatformUserProfile>(
    `
      SELECT user_id, email, name, platform_role
      FROM app_user_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );
  return rows[0] ?? null;
}

export async function getCompanyMembershipByUserId(userId: string) {
  const { rows } = await db.query<CompanyMembership>(
    `
      SELECT
        cm.id AS membership_id,
        c.id AS company_id,
        c.name AS company_name,
        c.slug AS company_slug,
        cm.user_id,
        cm.email
      FROM company_members cm
      INNER JOIN companies c ON c.id = cm.company_id
      WHERE cm.user_id = $1 AND cm.status = 'active'
      LIMIT 1
    `,
    [userId],
  );
  return rows[0] ?? null;
}

export async function listStoreAgentsForUser(userId: string) {
  const membership = await getCompanyMembershipByUserId(userId);
  if (!membership) {
    return [];
  }

  const { rows } = await db.query<
    PlatformAgentRecord & {
      runtime_agent_name: string | null;
      granted: boolean;
    }
  >(
    `
      SELECT
        pa.id,
        pa.slug,
        pa.name,
        pa.description,
        pa.category,
        pa.model,
        pa.tool_groups,
        pa.skills,
        pa.soul,
        pa.is_active,
        cag.runtime_agent_name,
        COALESCE(cag.enabled, FALSE) AS granted
      FROM platform_agents pa
      LEFT JOIN company_agent_grants cag
        ON cag.platform_agent_id = pa.id
       AND cag.company_id = $1
      WHERE pa.is_active = TRUE
      ORDER BY pa.category ASC, pa.name ASC
    `,
    [membership.company_id],
  );

  return rows.map((row) => ({
    ...row,
    tool_groups: parseToolGroups(row.tool_groups),
    skills: parseSkills(row.skills),
  })) as StoreAgentRecord[];
}

export async function listGrantedAgentsForUser(userId: string) {
  return (await listStoreAgentsForUser(userId)).filter((agent) => agent.granted);
}

export async function getGrantedAgentForUser(userId: string, slug: string) {
  const agents = await listStoreAgentsForUser(userId);
  return agents.find((agent) => agent.slug === slug && agent.granted) ?? null;
}

export async function getStoreAgentForUser(userId: string, slug: string) {
  const agents = await listStoreAgentsForUser(userId);
  return agents.find((agent) => agent.slug === slug) ?? null;
}

export async function listThreadsForUser(userId: string) {
  const { rows } = await db.query<
    ConversationThreadRecord & {
      platform_agent_slug: string;
      platform_agent_name: string;
    }
  >(
    `
      SELECT
        ct.id AS thread_id,
        ct.created_at::text,
        ct.updated_at::text,
        ct.title,
        ct.status,
        jsonb_build_object(
          'platform_agent_slug', pa.slug,
          'platform_agent_name', pa.name
        ) AS metadata
      FROM conversation_threads ct
      INNER JOIN platform_agents pa ON pa.id = ct.platform_agent_id
      WHERE ct.owner_user_id = $1
      ORDER BY ct.updated_at DESC
    `,
    [userId],
  );

  return rows.map((row) => ({
    thread_id: row.thread_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: row.title,
    status: row.status,
    metadata: row.metadata,
    values: {
      title: row.title,
    },
  })) as ConversationThreadRecord[];
}

export async function getThreadForUser(userId: string, threadId: string) {
  const { rows } = await db.query<
    {
      thread_id: string;
      owner_user_id: string;
      company_id: string;
      platform_agent_id: string;
      company_agent_grant_id: string;
      title: string;
      metadata: JsonRecord;
      runtime_agent_name: string;
      platform_agent_slug: string;
      platform_agent_name: string;
    }
  >(
    `
      SELECT
        ct.id AS thread_id,
        ct.owner_user_id,
        ct.company_id,
        ct.platform_agent_id,
        ct.company_agent_grant_id,
        ct.title,
        ct.metadata,
        cag.runtime_agent_name,
        pa.slug AS platform_agent_slug,
        pa.name AS platform_agent_name
      FROM conversation_threads ct
      INNER JOIN company_agent_grants cag ON cag.id = ct.company_agent_grant_id
      INNER JOIN platform_agents pa ON pa.id = ct.platform_agent_id
      WHERE ct.id = $1 AND ct.owner_user_id = $2
      LIMIT 1
    `,
    [threadId, userId],
  );

  return rows[0] ?? null;
}

export async function renameThreadForUser(userId: string, threadId: string, title: string) {
  const thread = await getThreadForUser(userId, threadId);
  if (!thread) {
    throw new Error("Thread not found.");
  }

  await gatewayFetch(`/api/threads/${threadId}/state`, {
    method: "POST",
    body: JSON.stringify({
      values: { title },
    }),
  });

  await db.query(
    `
      UPDATE conversation_threads
      SET title = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [threadId, title],
  );
}

export async function deleteThreadForUser(userId: string, threadId: string) {
  const thread = await getThreadForUser(userId, threadId);
  if (!thread) {
    throw new Error("Thread not found.");
  }

  await gatewayFetch(`/api/threads/${threadId}`, {
    method: "DELETE",
  });

  await db.query("DELETE FROM conversation_threads WHERE id = $1", [threadId]);
}

async function upsertRuntimeAgent(company: CompanyRecord, agent: PlatformAgentRecord) {
  const runtimeAgentName = buildRuntimeAgentName(company.slug, agent.slug);
  const soul = companyContextSoul(company.name, company.slug, agent.soul);
  const payload = {
    name: runtimeAgentName,
    description: `${company.name} / ${agent.name}`,
    model: agent.model,
    tool_groups: agent.tool_groups.length > 0 ? agent.tool_groups : null,
    skills: agent.skills,
    soul,
  };

  const check = await gatewayFetch(
    `/api/agents/check?name=${encodeURIComponent(runtimeAgentName)}`,
  );
  const availability = (await check.json()) as { available: boolean };
  if (availability.available) {
    await gatewayFetch("/api/agents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } else {
    await gatewayFetch(`/api/agents/${encodeURIComponent(runtimeAgentName)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  return runtimeAgentName;
}

export async function getCompanyMemoryPreviewForUser(
  userId: string,
): Promise<CompanyMemoryPreview> {
  const membership = await getCompanyMembershipByUserId(userId);
  if (!membership) {
    throw new Error("You are not assigned to a company yet.");
  }

  const grantedAgents = await listGrantedAgentsForUser(userId);
  const sourceAgents: CompanyMemorySourceAgent[] = grantedAgents
    .filter(
      (agent): agent is typeof agent & { runtime_agent_name: string } =>
        typeof agent.runtime_agent_name === "string" &&
        agent.runtime_agent_name.trim().length > 0,
    )
    .map((agent) => ({
      agentSlug: agent.slug,
      agentName: agent.name,
      runtimeAgentName: agent.runtime_agent_name,
    }));

  const emptyPreview: CompanyMemoryPreview = {
    scope: "company",
    company: {
      id: membership.company_id,
      slug: membership.company_slug,
      name: membership.company_name,
    },
    sourceAgents,
    lastUpdated: "",
    sections: {
      workContext: emptyPreviewSection(),
      personalContext: emptyPreviewSection(),
      topOfMind: emptyPreviewSection(),
      recentMonths: emptyPreviewSection(),
      earlierContext: emptyPreviewSection(),
      longTermBackground: emptyPreviewSection(),
    },
    facts: [],
  };

  if (sourceAgents.length === 0) {
    return emptyPreview;
  }

  const memoryResults = await Promise.all(
    sourceAgents.map(async (agent) => {
      try {
        const response = await gatewayFetch(
          `/api/memory?agent_name=${encodeURIComponent(agent.runtimeAgentName)}`,
        );
        const memory = (await response.json()) as GatewayMemoryResponse;
        return { agent, memory };
      } catch {
        return null;
      }
    }),
  );

  const availableMemory = memoryResults.filter(
    (
      result,
    ): result is {
      agent: CompanyMemorySourceAgent;
      memory: GatewayMemoryResponse;
    } => result !== null,
  );

  if (availableMemory.length === 0) {
    return emptyPreview;
  }

  const sections = MEMORY_SECTION_KEYS.reduce<
    Record<MemorySectionKey, CompanyMemoryPreviewSection>
  >((accumulator, key) => {
    const sources = availableMemory
      .map(({ agent, memory }) => {
        const section = getSectionData(memory, key);
        const summary = section.summary.trim();
        if (!summary) {
          return null;
        }

        return {
          ...agent,
          summary,
          updatedAt: section.updatedAt || memory.lastUpdated || "",
        };
      })
      .filter(
        (source): source is CompanyMemoryPreviewSectionSource => source !== null,
      );

    accumulator[key] = {
      summary: buildSectionSummary(sources),
      updatedAt: latestIsoTimestamp(sources.map((source) => source.updatedAt)),
      sources,
    };
    return accumulator;
  }, {
    workContext: emptyPreviewSection(),
    personalContext: emptyPreviewSection(),
    topOfMind: emptyPreviewSection(),
    recentMonths: emptyPreviewSection(),
    earlierContext: emptyPreviewSection(),
    longTermBackground: emptyPreviewSection(),
  });

  const facts = availableMemory
    .flatMap(({ agent, memory }) =>
      memory.facts.map<CompanyMemoryPreviewFact>((fact) => ({
        ...fact,
        agentSlug: agent.agentSlug,
        agentName: agent.agentName,
        runtimeAgentName: agent.runtimeAgentName,
      })),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    ...emptyPreview,
    lastUpdated: latestIsoTimestamp([
      ...availableMemory.map(({ memory }) => memory.lastUpdated),
      ...MEMORY_SECTION_KEYS.map((key) => sections[key].updatedAt),
      ...facts.map((fact) => fact.createdAt),
    ]),
    sections,
    facts,
  };
}

export async function createThreadForUser(userId: string, agentSlug: string) {
  const membership = await getCompanyMembershipByUserId(userId);
  if (!membership) {
    throw new Error("You are not assigned to a company yet.");
  }

  const grantedAgent = await getGrantedAgentForUser(userId, agentSlug);
  if (!grantedAgent || !grantedAgent.granted) {
    throw new Error("This agent is not available for your company.");
  }

  const company: CompanyRecord = {
    id: membership.company_id,
    slug: membership.company_slug,
    name: membership.company_name,
    status: "active",
    created_at: "",
    updated_at: "",
  };

  const runtimeAgentName =
    grantedAgent.runtime_agent_name ?? (await upsertRuntimeAgent(company, grantedAgent));

  const grantRow = await db.query<{ id: string }>(
    `
      SELECT id
      FROM company_agent_grants
      WHERE company_id = $1 AND platform_agent_id = $2 AND enabled = TRUE
      LIMIT 1
    `,
    [membership.company_id, grantedAgent.id],
  );
  const grantId = grantRow.rows[0]?.id;
  if (!grantId) {
    throw new Error("This company is not granted access to the selected agent.");
  }

  if (!grantedAgent.runtime_agent_name) {
    await db.query(
      `
        UPDATE company_agent_grants
        SET runtime_agent_name = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [grantId, runtimeAgentName],
    );
  }

  const created = await gatewayFetch("/api/threads", {
    method: "POST",
    body: JSON.stringify({
      metadata: {
        platform_agent_slug: grantedAgent.slug,
        company_id: membership.company_id,
      },
    }),
  });
  const deerflowThread = (await created.json()) as { thread_id: string };
  const threadId = deerflowThread.thread_id;

  await db.query(
    `
      INSERT INTO conversation_threads (
        id,
        deerflow_thread_id,
        company_id,
        owner_user_id,
        platform_agent_id,
        company_agent_grant_id,
        title,
        status,
        metadata
      )
      VALUES ($1, $1, $2, $3, $4, $5, $6, 'idle', $7::jsonb)
    `,
    [
      threadId,
      membership.company_id,
      userId,
      grantedAgent.id,
      grantId,
      grantedAgent.name,
      JSON.stringify({
        platform_agent_slug: grantedAgent.slug,
        platform_agent_name: grantedAgent.name,
      }),
    ],
  );

  return {
    threadId,
    runtimeAgentName,
    agent: grantedAgent,
  };
}

export async function touchThreadTitle(threadId: string, title: string) {
  await db.query(
    `
      UPDATE conversation_threads
      SET title = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [threadId, title],
  );
}

export async function listCompanies() {
  const { rows } = await db.query<
    CompanyRecord & { member_count: string; granted_count: string }
  >(
    `
      SELECT
        c.*,
        COUNT(DISTINCT cm.id)::text AS member_count,
        COUNT(DISTINCT cag.id)::text AS granted_count
      FROM companies c
      LEFT JOIN company_members cm ON cm.company_id = c.id
      LEFT JOIN company_agent_grants cag ON cag.company_id = c.id AND cag.enabled = TRUE
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `,
  );
  return rows;
}

export async function createCompany(name: string) {
  const slugBase = slugifyCompanyName(name) || "company";
  let slug = slugBase;
  let suffix = 1;
  while (true) {
    const existing = await db.query<{ id: string }>(
      "SELECT id FROM companies WHERE slug = $1 LIMIT 1",
      [slug],
    );
    if (existing.rowCount === 0) {
      break;
    }
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO companies (id, slug, name, status)
      VALUES ($1, $2, $3, 'active')
    `,
    [id, slug, name.trim()],
  );
  return { id, slug, name: name.trim() };
}

export async function listPlatformAgents() {
  const { rows } = await db.query<PlatformAgentRecord>(
    `
      SELECT id, slug, name, description, category, model, tool_groups, skills, soul, is_active
      FROM platform_agents
      ORDER BY category ASC, name ASC
    `,
  );
  return rows.map((row) => ({
    ...row,
    tool_groups: parseToolGroups(row.tool_groups),
    skills: parseSkills(row.skills),
  })) as PlatformAgentRecord[];
}

export async function createPlatformAgent(input: {
  slug: string;
  name: string;
  description: string;
  category: string;
  model: string | null;
  tool_groups: string[];
  skills: string[] | null;
  soul: string;
}) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO platform_agents (
        id, slug, name, description, category, model, tool_groups, skills, soul, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, TRUE)
    `,
    [
      id,
      input.slug,
      input.name,
      input.description,
      input.category,
      input.model,
      JSON.stringify(input.tool_groups),
      input.skills === null ? null : JSON.stringify(input.skills),
      input.soul,
    ],
  );
  return id;
}

export async function updatePlatformAgent(
  id: string,
  input: {
    name: string;
    description: string;
    category: string;
    model: string | null;
    tool_groups: string[];
    skills: string[] | null;
    soul: string;
    is_active: boolean;
  },
) {
  await db.query(
    `
      UPDATE platform_agents
      SET
        name = $2,
        description = $3,
        category = $4,
        model = $5,
        tool_groups = $6::jsonb,
        skills = $7::jsonb,
        soul = $8,
        is_active = $9,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      id,
      input.name,
      input.description,
      input.category,
      input.model,
      JSON.stringify(input.tool_groups),
      input.skills === null ? null : JSON.stringify(input.skills),
      input.soul,
      input.is_active,
    ],
  );

  const grants = await db.query<
    { company_id: string; slug: string; name: string; status: string }
  >(
    `
      SELECT c.id AS company_id, c.slug, c.name, c.status
      FROM company_agent_grants cag
      INNER JOIN companies c ON c.id = cag.company_id
      WHERE cag.platform_agent_id = $1 AND cag.enabled = TRUE
    `,
    [id],
  );

  const updatedAgent = await db.query<PlatformAgentRecord>(
    `
      SELECT id, slug, name, description, category, model, tool_groups, skills, soul, is_active
      FROM platform_agents
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
  const agent = updatedAgent.rows[0];
  if (!agent) {
    return;
  }

  const normalizedAgent = {
    ...agent,
    tool_groups: parseToolGroups(agent.tool_groups),
    skills: parseSkills(agent.skills),
  } as PlatformAgentRecord;

  for (const grant of grants.rows) {
    const runtimeAgentName = await upsertRuntimeAgent(
      {
        id: grant.company_id,
        slug: grant.slug,
        name: grant.name,
        status: grant.status,
        created_at: "",
        updated_at: "",
      },
      normalizedAgent,
    );

    await db.query(
      `
        UPDATE company_agent_grants
        SET runtime_agent_name = $2, updated_at = NOW()
        WHERE company_id = $1 AND platform_agent_id = $3
      `,
      [grant.company_id, runtimeAgentName, id],
    );
  }
}

export async function getCompanyAdminDetail(companyId: string) {
  const company = await db.query<CompanyRecord>(
    `SELECT id, slug, name, status, created_at::text, updated_at::text FROM companies WHERE id = $1 LIMIT 1`,
    [companyId],
  );
  if (company.rowCount === 0) {
    return null;
  }

  const members = await db.query<
    { user_id: string; email: string; name: string | null; joined_at: string }
  >(
    `
      SELECT
        cm.user_id,
        cm.email,
        COALESCE(aup.name, u.name) AS name,
        cm.created_at::text AS joined_at
      FROM company_members cm
      LEFT JOIN app_user_profiles aup ON aup.user_id = cm.user_id
      LEFT JOIN "user" u ON u.id = cm.user_id
      WHERE cm.company_id = $1
      ORDER BY cm.created_at DESC
    `,
    [companyId],
  );

  const invites = await db.query<InviteRecord>(
    `
      SELECT id, company_id, email, token, expires_at::text, accepted_at::text, created_at::text
      FROM company_invites
      WHERE company_id = $1
      ORDER BY created_at DESC
    `,
    [companyId],
  );

  const grants = await db.query<
    {
      platform_agent_id: string;
      company_id: string;
      enabled: boolean;
      runtime_agent_name: string;
      slug: string;
      name: string;
      description: string;
    }
  >(
    `
      SELECT
        pa.id AS platform_agent_id,
        cag.company_id,
        COALESCE(cag.enabled, FALSE) AS enabled,
        COALESCE(cag.runtime_agent_name, '') AS runtime_agent_name,
        pa.slug,
        pa.name,
        pa.description
      FROM platform_agents pa
      LEFT JOIN company_agent_grants cag
        ON cag.platform_agent_id = pa.id AND cag.company_id = $1
      ORDER BY pa.category ASC, pa.name ASC
    `,
    [companyId],
  );

  return {
    company: company.rows[0],
    members: members.rows,
    invites: invites.rows,
    grants: grants.rows,
  };
}

export async function createCompanyInvite(companyId: string, email: string, invitedByUserId: string) {
  const token = randomBytes(24).toString("hex");
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  await db.query(
    `
      INSERT INTO company_invites (
        id, company_id, email, token, invited_by_user_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [id, companyId, email.trim().toLowerCase(), token, invitedByUserId, expiresAt],
  );
  return { id, token, expiresAt };
}

export async function getInviteByToken(token: string) {
  const { rows } = await db.query<InviteRecord>(
    `
      SELECT
        ci.id,
        ci.company_id,
        ci.email,
        ci.token,
        ci.expires_at::text,
        ci.accepted_at::text,
        ci.created_at::text,
        c.name AS company_name,
        c.slug AS company_slug
      FROM company_invites ci
      INNER JOIN companies c ON c.id = ci.company_id
      WHERE ci.token = $1
      LIMIT 1
    `,
    [token],
  );
  return rows[0] ?? null;
}

export async function acceptInviteForUser(token: string, user: Session["user"]) {
  const invite = await getInviteByToken(token);
  if (!invite) {
    throw new Error("Invite not found.");
  }
  if (invite.accepted_at) {
    throw new Error("This invite has already been used.");
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("This invite has expired.");
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite belongs to a different email address.");
  }

  const existingMembership = await getCompanyMembershipByUserId(user.id);
  if (existingMembership) {
    throw new Error("This account already belongs to a company.");
  }

  await ensureUserProfileForSession(user);

  await db.query(
    `
      INSERT INTO company_members (id, company_id, user_id, email, status)
      VALUES ($1, $2, $3, $4, 'active')
    `,
    [randomUUID(), invite.company_id, user.id, user.email.toLowerCase()],
  );

  await db.query(
    `
      UPDATE company_invites
      SET accepted_at = NOW(), accepted_by_user_id = $2
      WHERE id = $1
    `,
    [invite.id, user.id],
  );
}

export async function setCompanyAgentGrants(companyId: string, platformAgentIds: string[]) {
  const agents = await db.query<PlatformAgentRecord>(
    `
      SELECT id, slug, name, description, category, model, tool_groups, skills, soul, is_active
      FROM platform_agents
      WHERE id = ANY($1::text[])
    `,
    [platformAgentIds],
  );

  const companyResult = await db.query<CompanyRecord>(
    `SELECT id, slug, name, status, created_at::text, updated_at::text FROM companies WHERE id = $1 LIMIT 1`,
    [companyId],
  );
  const company = companyResult.rows[0];
  if (!company) {
    throw new Error("Company not found.");
  }

  await db.query(
    `
      UPDATE company_agent_grants
      SET enabled = FALSE, updated_at = NOW()
      WHERE company_id = $1
    `,
    [companyId],
  );

  for (const agent of agents.rows.map((row) => ({
    ...row,
    tool_groups: parseToolGroups(row.tool_groups),
    skills: parseSkills(row.skills),
  } as PlatformAgentRecord))) {
    const runtimeAgentName = await upsertRuntimeAgent(company, agent);
    await db.query(
      `
        INSERT INTO company_agent_grants (
          id, company_id, platform_agent_id, runtime_agent_name, enabled
        )
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (company_id, platform_agent_id)
        DO UPDATE SET
          runtime_agent_name = EXCLUDED.runtime_agent_name,
          enabled = TRUE,
          updated_at = NOW()
      `,
      [randomUUID(), companyId, agent.id, runtimeAgentName],
    );
  }
}
