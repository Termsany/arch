import { useState } from "react";
import { useClientAuth } from "@/hooks/use-client-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function ClientLogin() {
  const { loginAsClient, isLoading } = useClientAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAsClient(email, password);
    } catch {
      // error is toasted inside hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30" dir="rtl">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">A</div>
            <span className="text-2xl font-bold text-primary">ArchSaaS</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">بوابة العملاء</h1>
          <p className="text-muted-foreground mt-1 text-sm">سجّل دخولك لمتابعة مشاريعك</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات حسابك للوصول إلى بوابة العملاء</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جارٍ تسجيل الدخول...
                  </>
                ) : (
                  "دخول"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          هذه البوابة مخصصة للعملاء فقط.{" "}
          <a href="/login" className="text-primary hover:underline">صفحة دخول المشرفين</a>
        </p>
        <div className="mt-3 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowRight className="w-4 h-4" />
            العودة لاختيار نوع الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
