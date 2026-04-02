import { betterAuth } from "better-auth";

import { env } from "@/env";
import { db } from "@/server/platform/db";

export const auth = betterAuth({
  database: db,
  secret:
    env.BETTER_AUTH_SECRET ?? "deerflow-platform-dev-secret-change-me",
  baseURL: env.BETTER_AUTH_BASE_URL ?? "http://localhost:3026",
  emailAndPassword: {
    enabled: true,
  },
});

export type Session = typeof auth.$Infer.Session;
