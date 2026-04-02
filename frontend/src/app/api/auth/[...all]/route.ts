import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/better-auth";
import { ensurePlatformSetup } from "@/server/platform/setup";

const handler = toNextJsHandler(auth.handler);

export async function GET(request: Request) {
  await ensurePlatformSetup();
  return handler.GET(request);
}

export async function POST(request: Request) {
  await ensurePlatformSetup();
  return handler.POST(request);
}
