import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function activateInvite(inviteCode: string, newSecret: string, fallbackMessage: string): Promise<void> {
  const response = await fetch("/api/invites/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode, newSecret }),
  });

  const data = await response.json().catch(() => null) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
}

export default function ActivateInvite() {
  const { direction, t } = useTranslation();
  const [, setLocation] = useLocation();
  const inviteCode = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [secret, setSecret] = useState("");
  const [secretConfirm, setSecretConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inviteCode) {
      toast({ title: t("error.invalidInvite"), variant: "destructive" });
      return;
    }

    if (secret.length < 8) {
      toast({ title: t("error.secretMin"), variant: "destructive" });
      return;
    }

    if (secret !== secretConfirm) {
      toast({ title: t("error.secretMismatch"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await activateInvite(inviteCode, secret, t("error.tryAgain"));
      setIsDone(true);
      toast({ title: t("toast.accountActivated") });
    } catch (error) {
      toast({ title: getErrorMessage(error, t("error.tryAgain")), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4" dir={direction}>
      <div className="fixed top-4 end-4 z-20">
        <LanguageSwitcher compact />
      </div>
      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/90 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            {isDone ? <CheckCircle2 className="w-8 h-8 text-primary-foreground" /> : <Building2 className="w-8 h-8 text-primary-foreground" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isDone ? t("invite.doneTitle") : t("invite.title")}
          </CardTitle>
          <CardDescription>
            {isDone ? t("invite.doneDescription") : t("invite.description")}
          </CardDescription>
        </CardHeader>

        {isDone ? (
          <CardFooter className="pb-8">
            <Button className="w-full h-12" onClick={() => setLocation("/login")}>{t("invite.goLogin")}</Button>
          </CardFooter>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {!inviteCode && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {t("invite.invalidLink")}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="secret">{t("invite.newSecret")}</Label>
                <Input
                  id="secret"
                  type="password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  minLength={8}
                  required
                  className="h-12"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretConfirm">{t("invite.confirmSecret")}</Label>
                <Input
                  id="secretConfirm"
                  type="password"
                  value={secretConfirm}
                  onChange={(event) => setSecretConfirm(event.target.value)}
                  minLength={8}
                  required
                  className="h-12"
                  dir="ltr"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button type="submit" className="w-full h-12" disabled={isSubmitting || !inviteCode}>
                {isSubmitting ? t("invite.submitting") : t("invite.submit")}
              </Button>
              <Link href="/login" className="text-sm text-primary hover:underline">
                {t("invite.backLogin")}
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
