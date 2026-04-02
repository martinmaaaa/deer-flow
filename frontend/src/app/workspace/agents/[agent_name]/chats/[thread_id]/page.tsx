"use client";

import { BotIcon, Loader2Icon, PlusSquare } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { ArtifactTrigger } from "@/components/workspace/artifacts";
import { ChatBox } from "@/components/workspace/chats";
import { ExportTrigger } from "@/components/workspace/export-trigger";
import { InputBox } from "@/components/workspace/input-box";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { ThreadTitle } from "@/components/workspace/thread-title";
import { TodoList } from "@/components/workspace/todo-list";
import { TokenUsageIndicator } from "@/components/workspace/token-usage-indicator";
import { Tooltip } from "@/components/workspace/tooltip";
import { useI18n } from "@/core/i18n/hooks";
import { useNotification } from "@/core/notification/hooks";
import { createPlatformThread } from "@/core/platform/api";
import { usePlatformAgent } from "@/core/platform/hooks";
import { useThreadSettings } from "@/core/settings";
import { useThreadStream } from "@/core/threads/hooks";
import { textOfMessage } from "@/core/threads/utils";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export default function AgentChatPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { showNotification } = useNotification();

  const { agent_name, thread_id } = useParams<{
    agent_name: string;
    thread_id: string;
  }>();

  const isNewThread = thread_id === "new";
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(
    isNewThread ? null : thread_id,
  );
  const [runtimeAgentName, setRuntimeAgentName] = useState<string | null>(null);
  const [creatingThread, setCreatingThread] = useState(isNewThread);
  const [settings, setSettings] = useThreadSettings(
    resolvedThreadId ?? thread_id,
  );
  const { agent, isLoading: agentLoading } = usePlatformAgent(agent_name);
  useEffect(() => {
    let cancelled = false;
    if (!isNewThread) {
      setResolvedThreadId(thread_id);
      return;
    }
    if (!agent || !agent.granted || creatingThread === false) {
      return;
    }

    void (async () => {
      try {
        const created = await createPlatformThread(agent_name);
        if (cancelled) {
          return;
        }
        setResolvedThreadId(created.threadId);
        setRuntimeAgentName(created.runtimeAgentName);
        setCreatingThread(false);
        history.replaceState(
          null,
          "",
          `/workspace/agents/${agent_name}/chats/${created.threadId}`,
        );
      } catch {
        if (!cancelled) {
          setCreatingThread(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agent, agent_name, creatingThread, isNewThread, thread_id]);

  const resolvedRuntimeAgentName =
    runtimeAgentName ?? agent?.runtime_agent_name ?? null;

  const [thread, sendMessage, isUploading] = useThreadStream({
    threadId: resolvedThreadId ?? undefined,
    context: {
      ...settings.context,
      agent_name: resolvedRuntimeAgentName ?? undefined,
    },
    onFinish: (state) => {
      if (document.hidden || !document.hasFocus()) {
        let body = "Conversation finished";
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage) {
          const textContent = textOfMessage(lastMessage);
          if (textContent) {
            body =
              textContent.length > 200
                ? textContent.substring(0, 200) + "..."
                : textContent;
          }
        }
        showNotification(state.title, { body });
      }
    },
  });

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!resolvedThreadId || !resolvedRuntimeAgentName) {
        return;
      }
      void sendMessage(resolvedThreadId, message, {
        agent_name: resolvedRuntimeAgentName,
      });
    },
    [resolvedRuntimeAgentName, resolvedThreadId, sendMessage],
  );

  const handleStop = useCallback(async () => {
    await thread.stop();
  }, [thread]);

  const disabled = useMemo(() => {
    return (
      env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ||
      isUploading ||
      creatingThread ||
      agentLoading ||
      !agent?.granted ||
      !resolvedThreadId ||
      !resolvedRuntimeAgentName
    );
  }, [
    agent?.granted,
    agentLoading,
    creatingThread,
    isUploading,
    resolvedRuntimeAgentName,
    resolvedThreadId,
  ]);

  return (
    <ThreadContext.Provider value={{ thread }}>
      <ChatBox threadId={resolvedThreadId ?? "pending"}>
        <div className="relative flex size-full min-h-0 justify-between">
          <header
            className={cn(
              "absolute top-0 right-0 left-0 z-30 flex h-12 shrink-0 items-center gap-2 px-4",
              "bg-background/80 shadow-xs backdrop-blur",
            )}
          >
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1">
              <BotIcon className="text-primary h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {agent?.name ?? agent_name}
              </span>
            </div>

            <div className="flex w-full items-center text-sm font-medium">
              <ThreadTitle
                threadId={resolvedThreadId ?? "pending"}
                thread={thread}
              />
            </div>
            <div className="mr-4 flex items-center">
              <Tooltip content={t.agents.newChat}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    router.push(`/workspace/agents/${agent_name}/chats/new`);
                  }}
                >
                  <PlusSquare /> {t.agents.newChat}
                </Button>
              </Tooltip>
              <TokenUsageIndicator messages={thread.messages} />
              <ExportTrigger threadId={resolvedThreadId ?? "pending"} />
              <ArtifactTrigger />
            </div>
          </header>

          <main className="flex min-h-0 max-w-full grow flex-col">
            <div className="flex size-full justify-center">
              {agentLoading || creatingThread ? (
                <div className="text-muted-foreground flex size-full items-center justify-center gap-2 pt-16 text-sm">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  正在准备企业智能体会话...
                </div>
              ) : !agent?.granted ? (
                <div className="text-muted-foreground flex size-full items-center justify-center pt-16 text-sm">
                  当前公司未开通这个智能体，请联系平台管理员授权。
                </div>
              ) : (
                <MessageList
                  className="size-full pt-10"
                  threadId={resolvedThreadId ?? "pending"}
                  thread={thread}
                />
              )}
            </div>

            <div className="absolute right-0 bottom-0 left-0 z-30 flex justify-center px-4">
              <div className="relative w-full max-w-(--container-width-md)">
                <div className="absolute -top-4 right-0 left-0 z-0">
                  <div className="absolute right-0 bottom-0 left-0">
                    <TodoList
                      className="bg-background/5"
                      todos={thread.values.todos ?? []}
                      hidden={
                        !thread.values.todos || thread.values.todos.length === 0
                      }
                    />
                  </div>
                </div>

                <InputBox
                  className={cn("bg-background/5 w-full -translate-y-4")}
                  isNewThread={false}
                  threadId={resolvedThreadId ?? "pending"}
                  autoFocus
                  status={
                    thread.error
                      ? "error"
                      : thread.isLoading
                        ? "streaming"
                        : "ready"
                  }
                  context={settings.context}
                  extraHeader={
                    <div className="text-muted-foreground px-1 text-sm">
                      {agent?.description ??
                        "面向企业内容团队的智能体工作区"}
                    </div>
                  }
                  disabled={disabled}
                  onContextChange={(context) => setSettings("context", context)}
                  onSubmit={handleSubmit}
                  onStop={handleStop}
                />
                {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" && (
                  <div className="text-muted-foreground/67 w-full translate-y-12 text-center text-xs">
                    {t.common.notAvailableInDemoMode}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </ChatBox>
    </ThreadContext.Provider>
  );
}
