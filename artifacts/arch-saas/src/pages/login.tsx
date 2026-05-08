import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n/language-context";
import { setLocalizedMeta } from "@/i18n/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Building2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const { login, isLoading } = useAuth();
  const { direction, language, t } = useTranslation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");

  useEffect(() => {
    setLocalizedMeta("login", language);
  }, [language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email: email.trim(), password });
    } catch {
      // The auth hook displays a localized toast for login failures.
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4" dir={direction}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">{t("auth.login.title")}</CardTitle>
          <CardDescription className="text-base">{t("auth.login.description")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
                dir="ltr"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
              {isLoading ? t("auth.login.loading") : t("auth.login.action")}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.login.demo")} <span dir="ltr" className="font-mono text-xs bg-muted px-1 py-0.5 rounded">admin@example.com / admin123</span>
            </p>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ArrowRight className="w-4 h-4" />
              {t("auth.backHome")}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
