import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, CheckCircle2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "حدث خطأ حاول مرة أخرى";
}

async function activateInvite(inviteCode: string, newSecret: string): Promise<void> {
  const response = await fetch("/api/invites/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode, newSecret }),
  });

  const data = await response.json().catch(() => null) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message || "تعذر تفعيل الحساب");
  }
}

export default function ActivateInvite() {
  const [, setLocation] = useLocation();
  const inviteCode = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [secret, setSecret] = useState("");
  const [secretConfirm, setSecretConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inviteCode) {
      toast({ title: "رابط الدعوة غير صحيح", variant: "destructive" });
      return;
    }

    if (secret.length < 8) {
      toast({ title: "كلمة السر يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }

    if (secret !== secretConfirm) {
      toast({ title: "تأكيد كلمة السر غير مطابق", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await activateInvite(inviteCode, secret);
      setIsDone(true);
      toast({ title: "تم تفعيل الحساب بنجاح" });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/90 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            {isDone ? <CheckCircle2 className="w-8 h-8 text-primary-foreground" /> : <Building2 className="w-8 h-8 text-primary-foreground" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isDone ? "تم تفعيل الحساب" : "تفعيل الدعوة"}
          </CardTitle>
          <CardDescription>
            {isDone ? "يمكنك الآن تسجيل الدخول ببيانات الحساب الجديدة." : "أدخل كلمة سر جديدة لتفعيل حساب مدير المكتب."}
          </CardDescription>
        </CardHeader>

        {isDone ? (
          <CardFooter className="pb-8">
            <Button className="w-full h-12" onClick={() => setLocation("/login")}>الذهاب لتسجيل الدخول</Button>
          </CardFooter>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {!inviteCode && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  رابط الدعوة غير صحيح أو ناقص.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="secret">كلمة السر الجديدة</Label>
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
                <Label htmlFor="secretConfirm">تأكيد كلمة السر</Label>
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
                {isSubmitting ? "جاري التفعيل..." : "تفعيل الحساب"}
              </Button>
              <Link href="/login" className="text-sm text-primary hover:underline">
                الرجوع لتسجيل الدخول
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
