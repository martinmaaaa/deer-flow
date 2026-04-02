"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/server/better-auth/client";

type SessionPayload = {
  isPlatformAdmin?: boolean;
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function getPostLoginPath() {
    try {
      const response = await fetch("/api/app/session", {
        cache: "no-store",
      });
      if (!response.ok) {
        return "/workspace";
      }

      const payload = (await response.json()) as SessionPayload;
      return payload.isPlatformAdmin ? "/admin" : "/workspace";
    } catch {
      return "/workspace";
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登录 DeerFlow 企业平台</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams.get("reason") === "no-company" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              你的账号还没有加入公司，请先使用管理员发出的邀请链接。
            </div>
          )}
          <Input
            placeholder="邮箱"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            placeholder="密码"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const result = await authClient.signIn.email({
                email,
                password,
              });
              setLoading(false);
              if (result.error) {
                toast.error(result.error.message ?? "登录失败");
                return;
              }
              router.push(await getPostLoginPath());
              router.refresh();
            }}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
          <p className="text-muted-foreground text-sm">
            企业成员需通过管理员发出的邀请链接加入公司。
          </p>
          <Link href="/" className="text-sm underline">
            返回首页
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
