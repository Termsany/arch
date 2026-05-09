import { useEffect } from "react";
import { useGetActivePlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/i18n/language-context";
import { setLocalizedMeta } from "@/i18n/seo";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Pricing() {
  const { direction, language, t, formatCurrency, formatNumber } = useTranslation();
  const { data: plans, isLoading } = useGetActivePlans();

  useEffect(() => {
    setLocalizedMeta("pricing", language);
  }, [language]);

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-primary">
            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-secondary-foreground">A</div>
            ArchSaaS
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher compact />
            <Link href="/login">
              <Button variant="ghost">{t("pricing.login")}</Button>
            </Link>
            <Link href="/start">
              <Button>{t("pricing.startNow")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
            {t("pricing.title")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-[500px] animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans?.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${plan.isRecommended ? 'border-primary shadow-xl scale-105 z-10' : 'border-border/50'}`}
              >
                {plan.isRecommended && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      {t("pricing.recommended")}
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl">{language === "ar" ? plan.nameAr : plan.nameEn || plan.nameAr}</CardTitle>
                  <CardDescription className="mt-2 min-h-[40px]">{plan.descriptionAr}</CardDescription>
                  <div className="mt-6 flex justify-center items-baseline gap-1 text-5xl font-extrabold">
                    <span dir="ltr">{formatCurrency(plan.monthlyPrice, "USD")}</span>
                    <span className="text-xl text-muted-foreground font-normal">/{t("pricing.month")}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 mt-6">
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span><strong dir="ltr">{formatNumber(plan.maxProjects)}</strong> {t("pricing.projects")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span><strong dir="ltr">{formatNumber(plan.maxClients)}</strong> {t("pricing.clients")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span><strong dir="ltr">{formatNumber(plan.maxUsers)}</strong> {t("pricing.users")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span dir="ltr">{formatNumber(plan.storageLimitMb / 1024)} GB</span> {t("pricing.storage")}
                    </li>
                    {plan.hasClientPortal && (
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>{t("pricing.clientPortal")}</span>
                      </li>
                    )}
                    {plan.hasWhatsappNotifications && (
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>{t("pricing.whatsapp")}</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
                
                <CardFooter className="pb-8">
                  <Link href="/start" className="w-full">
                    <Button className="w-full h-12 text-lg" variant={plan.isRecommended ? "default" : "outline"}>
                      {t("pricing.startNow")}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
