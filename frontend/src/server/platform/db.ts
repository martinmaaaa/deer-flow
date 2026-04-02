import { Pool } from "pg";

import { env } from "@/env";

declare global {
  var __deerflowPlatformPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString:
      env.DATABASE_URL ??
      "postgresql://deerflow:deerflow@127.0.0.1:5432/deerflow",
  });
}

export const db =
  globalThis.__deerflowPlatformPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__deerflowPlatformPool = db;
}
