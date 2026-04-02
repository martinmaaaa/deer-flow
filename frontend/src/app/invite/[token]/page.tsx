"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/server/better-auth/client";

type InvitePayload = {
  invite: {
    email: string;
    company_name?: string;
    accepted_at: string | null;
  };
};

export default function InvitePage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InvitePayload["invite"] | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch(`/api/app/invites/${token}`)
      .then(async (response) => {
        const payload = (await response.json()) as InvitePayload & {
          detail?: string;
        };
        if (!response.ok) {
          throw new Error(payload.detail ?? "邀请码无效");
        }
        setInvite(payload.invite);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "邀请码无效");
      });
  }, [token]);

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>加入企业空间</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invite ? (
            <>
              <div className="rounded-lg border px-3 py-2 text-sm">
                <div>公司：{invite.company_name ?? "企业租户"}</div>
                <div>邮箱：{invite.email}</div>
              </div>
              <Input
                placeholder="你的姓名"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Input value={invite.email} disabled />
              <Input
                placeholder="设置密码"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const signUp = await authClient.signUp.email({
                    email: invite.email,
                    password,
                    name,
                  });
                  if (signUp.error) {
                    const signIn = await authClient.signIn.email({
                      email: invite.email,
                      password,
                    });
                    if (signIn.error) {
                      setLoading(false);
                      toast.error(signUp.error.message ?? "注册失败");
                      return;
                    }
                  }

                  const accept = await fetch(
                    `/api/app/invites/${token}/accept`,
                    { method: "POST" },
                  );
                  const payload = (await accept.json().catch(() => ({}))) as {
                    detail?: string;
                  };
                  setLoading(false);
                  if (!accept.ok) {
                    toast.error(payload.detail ?? "加入企业失败");
                    return;
                  }
                  toast.success("已加入企业空间");
                  router.push("/workspace");
                  router.refresh();
                }}
              >
                {loading ? "加入中..." : "接受邀请并登录"}
              </Button>
            </>
          ) : (
            <div className="text-muted-foreground py-12 text-center text-sm">
              正在校验邀请码...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
