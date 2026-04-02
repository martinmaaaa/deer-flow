import { randomUUID } from "crypto";

import { getMigrations } from "better-auth/db";

import { env } from "@/env";
import { auth } from "@/server/better-auth";

import { db } from "./db";

type PlatformAgentSeed = {
  slug: string;
  name: string;
  description: string;
  category: string;
  model: string | null;
  toolGroups: string[];
  soul: string;
};

const DEFAULT_PLATFORM_AGENTS: PlatformAgentSeed[] = [
  {
    slug: "topic-planner",
    name: "选题助手",
    description:
      "围绕企业业务、行业趋势与传播目标，给出可执行的选题方向、系列策划与内容切角。",
    category: "内容策划",
    model: "deepseek-chat",
    toolGroups: [],
    soul: `你是一名服务中小企业的内容选题顾问。

- 目标是快速产出能执行的选题方向，而不是泛泛而谈的灵感清单。
- 优先围绕企业的产品、客户、行业趋势、热点机会、销售场景和品牌表达来给建议。
- 输出要兼顾传播性、业务相关性和低执行门槛。
- 如果信息不足，优先提出需要补充的关键信息，然后给出基于现有信息的可执行初稿。`,
  },
  {
    slug: "copywriting-assistant",
    name: "文案助手",
    description:
      "面向中小企业的高频营销与销售场景，生成适合短视频、图文、海报和私域传播的中文文案。",
    category: "内容创作",
    model: "deepseek-chat",
    toolGroups: [],
    soul: `你是一名服务中小企业的商业文案顾问。

- 你要兼顾业务目标、中文表达自然度和真实转化场景。
- 默认输出避免空泛的大词，强调具体利益点、受众感受、行动建议和可落地表达。
- 当用户没有指定渠道时，优先按短视频口播、图文标题、正文和转化收口几个层次组织内容。
- 如信息不全，要先指出缺失信息，再给一个可直接拿去修改使用的版本。`,
  },
];

let setupPromise: Promise<void> | null = null;

async function ensureAuthSchema() {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}

async function ensurePlatformTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      platform_role TEXT NOT NULL DEFAULT 'company_member',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_members (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(company_id, user_id),
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS company_invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      invited_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      accepted_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS platform_agents (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '通用',
      model TEXT,
      tool_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
      soul TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_agent_grants (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      platform_agent_id TEXT NOT NULL REFERENCES platform_agents(id) ON DELETE CASCADE,
      runtime_agent_name TEXT NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(company_id, platform_agent_id)
    );

    CREATE TABLE IF NOT EXISTS conversation_threads (
      id TEXT PRIMARY KEY,
      deerflow_thread_id TEXT NOT NULL UNIQUE,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      platform_agent_id TEXT NOT NULL REFERENCES platform_agents(id) ON DELETE CASCADE,
      company_agent_grant_id TEXT NOT NULL REFERENCES company_agent_grants(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'idle',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON company_invites(company_id);
    CREATE INDEX IF NOT EXISTS idx_platform_agents_active ON platform_agents(is_active);
    CREATE INDEX IF NOT EXISTS idx_company_agent_grants_company_id ON company_agent_grants(company_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_threads_owner_user_id ON conversation_threads(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_threads_company_id ON conversation_threads(company_id);
  `);
}

async function seedPlatformAgents() {
  const { rows } = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM platform_agents",
  );
  if (Number(rows[0]?.count ?? 0) > 0) {
    return;
  }

  for (const agent of DEFAULT_PLATFORM_AGENTS) {
    await db.query(
      `
        INSERT INTO platform_agents (
          id, slug, name, description, category, model, tool_groups, soul, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, TRUE)
      `,
      [
        randomUUID(),
        agent.slug,
        agent.name,
        agent.description,
        agent.category,
        agent.model,
        JSON.stringify(agent.toolGroups),
        agent.soul,
      ],
    );
  }
}

async function seedBootstrapAdmin() {
  const email = env.PLATFORM_BOOTSTRAP_ADMIN_EMAIL;
  const password = env.PLATFORM_BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    return;
  }

  const existingUser = await db.query<{ id: string }>(
    'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
    [email],
  );

  if (existingUser.rowCount === 0) {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: env.PLATFORM_BOOTSTRAP_ADMIN_NAME ?? "Platform Admin",
      },
    });
  }

  const createdUser = await db.query<{ id: string; name: string | null }>(
    'SELECT id, name FROM "user" WHERE email = $1 LIMIT 1',
    [email],
  );
  const user = createdUser.rows[0];
  if (!user) {
    return;
  }

  await db.query(
    `
      INSERT INTO app_user_profiles (user_id, email, name, platform_role)
      VALUES ($1, $2, $3, 'platform_admin')
      ON CONFLICT (user_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        platform_role = 'platform_admin',
        updated_at = NOW()
    `,
    [user.id, email, user.name ?? env.PLATFORM_BOOTSTRAP_ADMIN_NAME ?? null],
  );
}

export async function ensurePlatformSetup() {
  if (setupPromise) {
    await setupPromise;
    return;
  }

  setupPromise = (async () => {
    await ensureAuthSchema();
    await ensurePlatformTables();
    await seedPlatformAgents();
    await seedBootstrapAdmin();
  })();

  await setupPromise;
}
