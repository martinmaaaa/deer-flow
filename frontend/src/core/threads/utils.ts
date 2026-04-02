import type { Message } from "@langchain/langgraph-sdk";

import type { AgentThread } from "./types";

function threadMetadata(thread: AgentThread) {
  return thread.metadata as Record<string, unknown> | undefined;
}

export function pathOfThread(thread: AgentThread | string) {
  if (typeof thread === "string") {
    return `/workspace/chats/${thread}`;
  }

  const slug = threadMetadata(thread)?.platform_agent_slug;
  if (typeof slug === "string" && slug.length > 0) {
    return `/workspace/agents/${slug}/chats/${thread.thread_id}`;
  }

  return `/workspace/chats/${thread.thread_id}`;
}

export function textOfMessage(message: Message) {
  if (typeof message.content === "string") {
    return message.content;
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === "text") {
        return part.text;
      }
    }
  }
  return null;
}

export function agentNameOfThread(thread: AgentThread) {
  const name = threadMetadata(thread)?.platform_agent_name;
  return typeof name === "string" && name.length > 0 ? name : null;
}

export function titleOfThread(thread: AgentThread) {
  return thread.values?.title ?? agentNameOfThread(thread) ?? "Untitled";
}
