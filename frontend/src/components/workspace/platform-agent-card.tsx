"use client";

import { BotIcon, MessageSquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlatformAgent } from "@/core/platform/types";

export function PlatformAgentCard({
  agent,
  showOnlyGranted = false,
}: {
  agent: PlatformAgent;
  showOnlyGranted?: boolean;
}) {
  const router = useRouter();

  return (
    <Card className="group flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <BotIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{agent.name}</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {agent.category}
                </Badge>
                {agent.model && (
                  <Badge variant="outline" className="text-xs">
                    {agent.model}
                  </Badge>
                )}
                {agent.granted && (
                  <Badge className="text-xs">已开通</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {agent.description || "暂无描述"}
        </p>
        {agent.tool_groups.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tool_groups.map((group) => (
              <Badge key={group} variant="outline" className="text-xs">
                {group}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto pt-0">
        <Button
          className="w-full"
          disabled={!agent.granted}
          variant={agent.granted ? "default" : "secondary"}
          onClick={() => {
            if (agent.granted) {
              router.push(`/workspace/agents/${agent.slug}/chats/new`);
            }
          }}
        >
          <MessageSquareIcon className="mr-1.5 h-4 w-4" />
          {showOnlyGranted ? "开始对话" : agent.granted ? "开始对话" : "未开通"}
        </Button>
      </CardFooter>
    </Card>
  );
}
