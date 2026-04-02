"use client";

import { BotIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyPlatformAgents, useStoreAgents } from "@/core/platform/hooks";

import { PlatformAgentCard } from "./platform-agent-card";

const TABS = [
  { key: "store", label: "智能体商店" },
  { key: "mine", label: "我的智能体" },
] as const;

export function PlatformAgentGallery() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("store");
  const store = useStoreAgents();
  const mine = useMyPlatformAgents();

  useEffect(() => {
    document.title = "智能体商店 - DeerFlow";
  }, []);

  const current = tab === "store" ? store : mine;
  const items = current.agents;

  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">智能体平台</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            面向中小企业的选题与文案智能体目录
          </p>
        </div>
        <Badge variant="secondary">V1</Badge>
      </div>

      <div className="flex items-center gap-2 border-b px-6 py-3">
        {TABS.map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {current.isLoading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            正在加载智能体...
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
              <BotIcon className="text-muted-foreground h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">
                {tab === "store" ? "暂无可用智能体" : "你的公司还没有开通智能体"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {tab === "store"
                  ? "请稍后再试，或联系平台管理员上架内容智能体。"
                  : "请联系平台管理员为你的公司授权智能体。"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((agent) => (
              <PlatformAgentCard
                key={agent.id}
                agent={agent}
                showOnlyGranted={tab === "mine"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
