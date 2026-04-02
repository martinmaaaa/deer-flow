"use client";

import { Streamdown } from "streamdown";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/core/i18n/hooks";
import { useCompanyMemoryPreview } from "@/core/platform/hooks";
import { streamdownPlugins } from "@/core/streamdown/plugins";
import { formatTimeAgo } from "@/core/utils/datetime";

import { SettingsSection } from "./settings-section";

type MemorySectionKey =
  | "workContext"
  | "personalContext"
  | "topOfMind"
  | "recentMonths"
  | "earlierContext"
  | "longTermBackground";

function confidenceToLevelKey(confidence: unknown): {
  key: "veryHigh" | "high" | "normal" | "unknown";
} {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return { key: "unknown" };
  }

  if (confidence >= 0.85) return { key: "veryHigh" };
  if (confidence >= 0.65) return { key: "high" };
  return { key: "normal" };
}

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { preview, isLoading, error } = useCompanyMemoryPreview();

  const sectionConfigs: Array<{ key: MemorySectionKey; title: string }> = [
    { key: "workContext", title: t.settings.memory.markdown.work },
    { key: "personalContext", title: t.settings.memory.markdown.personal },
    { key: "topOfMind", title: t.settings.memory.markdown.topOfMind },
    { key: "recentMonths", title: t.settings.memory.markdown.recentMonths },
    { key: "earlierContext", title: t.settings.memory.markdown.earlierContext },
    {
      key: "longTermBackground",
      title: t.settings.memory.markdown.longTermBackground,
    },
  ];

  const hasPreviewContent = preview
    ? sectionConfigs.some(
        ({ key }) =>
          preview.sections[key].sources.length > 0 ||
          preview.sections[key].summary.trim().length > 0,
      ) || preview.facts.length > 0
    : false;

  return (
    <SettingsSection
      title={t.settings.memory.title}
      description={t.settings.memory.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : !preview ? (
        <div className="text-muted-foreground text-sm">
          {t.settings.memory.empty}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2 rounded-lg border p-4">
            <h3 className="text-base font-medium">
              {t.settings.memory.automaticTitle}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t.settings.memory.automaticDescription}
            </p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-medium">
                  {t.settings.memory.scopeTitle}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t.settings.memory.scopeDescription}
                </p>
              </div>
              <Badge variant="secondary">
                {t.settings.memory.scopeCompanyBadge}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  {t.settings.memory.scopeCompanyLabel}
                </div>
                <div className="mt-1 text-sm font-medium">
                  {preview.company.name}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  {t.settings.memory.scopeAgentsLabel}
                </div>
                <div className="mt-1 text-sm font-medium">
                  {preview.sourceAgents.length}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  {t.common.lastUpdated}
                </div>
                <div className="mt-1 text-sm font-medium">
                  {preview.lastUpdated
                    ? formatTimeAgo(preview.lastUpdated)
                    : "-"}
                </div>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              {t.settings.memory.scopeRuntimeNote}
            </p>
          </div>

          <div className="space-y-5 rounded-lg border p-4">
            <div className="space-y-2">
              <h3 className="text-base font-medium">
                {t.settings.memory.previewTitle}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t.settings.memory.previewDescription}
              </p>
            </div>

            {preview.sourceAgents.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                {t.settings.memory.previewNoAgents}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    {t.settings.memory.sourceAgentsTitle}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preview.sourceAgents.map((agent) => (
                      <Badge
                        key={agent.runtimeAgentName}
                        variant="outline"
                        className="px-2 py-1"
                      >
                        {agent.agentName}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {!hasPreviewContent ? (
                  <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                    {t.settings.memory.previewEmpty}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {sectionConfigs.map(({ key, title }) => {
                        const section = preview.sections[key];
                        return (
                          <div
                            key={key}
                            className="space-y-3 rounded-lg border p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium">{title}</div>
                              <div className="text-muted-foreground text-xs">
                                {section.updatedAt
                                  ? formatTimeAgo(section.updatedAt)
                                  : t.settings.memory.markdown.empty}
                              </div>
                            </div>
                            {section.summary.trim() ? (
                              <Streamdown
                                className="size-full text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                {...streamdownPlugins}
                              >
                                {section.summary}
                              </Streamdown>
                            ) : (
                              <div className="text-muted-foreground text-sm">
                                {t.settings.memory.markdown.empty}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-sm font-medium">
                        {t.settings.memory.markdown.facts}
                      </div>
                      {preview.facts.length === 0 ? (
                        <div className="text-muted-foreground text-sm">
                          {t.settings.memory.noFacts}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {preview.facts.map((fact) => {
                            const confidenceText =
                              t.settings.memory.markdown.table.confidenceLevel[
                                confidenceToLevelKey(fact.confidence).key
                              ];

                            return (
                              <div
                                key={`${fact.runtimeAgentName}:${fact.id}`}
                                className="space-y-3 rounded-lg border p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">
                                    {t.settings.memory.factsAgentLabel}: {fact.agentName}
                                  </Badge>
                                  <Badge variant="outline">
                                    {t.settings.memory.markdown.table.category}:{" "}
                                    {fact.category}
                                  </Badge>
                                  <Badge variant="outline">
                                    {t.settings.memory.markdown.table.confidence}:{" "}
                                    {confidenceText}
                                  </Badge>
                                  <span className="text-muted-foreground text-xs">
                                    {fact.createdAt
                                      ? formatTimeAgo(fact.createdAt)
                                      : "-"}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {fact.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
