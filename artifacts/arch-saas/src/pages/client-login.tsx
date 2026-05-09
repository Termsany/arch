import { useEffect, useState } from "react";
import { useClientAuth } from "@/hooks/use-client-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/i18n/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getStoredOfficeBranding, updateFavicon } from "@/lib/branding";

export default function ClientLogin() {
  const { direction, t } = useTranslation();
  const { loginAsClient, isLoading } = useClientAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const branding = getStoredOfficeBranding();
  const displayName = branding.officeName || "ArchSaaS";

  useEffect(() => {
    updateFavicon(branding.faviconUrl);
  }, [branding.faviconUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAsClient(email, password);
    } catch {
      // error is toasted inside hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30" dir={direction}>
      <div className="fixed top-4 end-4 z-20">
        <LanguageSwitcher compact />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={displayName} className="w-11 h-11 rounded-lg object-contain border border-border bg-background p-1" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: branding.brandColor }}>A</div>
            )}
            <span className="text-2xl font-bold" style={{ color: branding.brandColor }}>{displayName}</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">{t("clientLogin.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("clientLogin.subtitle")}</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("clientLogin.formTitle")}</CardTitle>
            <CardDescription>{t("clientLogin.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
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
                <Label htmlFor="password">{t("auth.password")}</Label>
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
              <Button type="submit" className="w-full mt-2" disabled={isLoading} style={{ backgroundColor: branding.brandColor }}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {t("clientLogin.loading")}
                  </>
                ) : (
                  t("clientLogin.submit")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t("clientLogin.onlyClients")}{" "}
          <a href="/login" className="text-primary hover:underline">{t("clientLogin.adminLogin")}</a>
        </p>
        <div className="mt-3 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowRight className="w-4 h-4" />
            {t("auth.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
