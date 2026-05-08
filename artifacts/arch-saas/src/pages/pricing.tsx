import { useEffect } from "react";
import { useGetActivePlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/i18n/language-context";
import { setLocalizedMeta } from "@/i18n/seo";

export default function Pricing() {
  const { direction, language } = useTranslation();
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
            <Link href="/login">
              <Button variant="ghost">تسجيل الدخول</Button>
            </Link>
            <Link href="/start">
              <Button>ابدأ الآن</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
            اختار الخطة المناسبة لمكتبك
          </h1>
          <p className="text-xl text-muted-foreground">
            أسعار شفافة ومناسبة لجميع أحجام المكاتب الهندسية وشركات التصميم الداخلي
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
                      موصى بها
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl">{plan.nameAr}</CardTitle>
                  <CardDescription className="mt-2 min-h-[40px]">{plan.descriptionAr}</CardDescription>
                  <div className="mt-6 flex justify-center items-baseline gap-1 text-5xl font-extrabold">
                    <span dir="ltr">${plan.monthlyPrice}</span>
                    <span className="text-xl text-muted-foreground font-normal">/شهر</span>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 mt-6">
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span><strong dir="ltr">{plan.maxProjects}</strong> مشروع</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span><strong dir="ltr">{plan.maxClients}</strong> عميل</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span><strong dir="ltr">{plan.maxUsers}</strong> مستخدم</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span dir="ltr">{plan.storageLimitMb / 1024} GB</span> مساحة تخزين
                    </li>
                    {plan.hasClientPortal && (
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>بوابة للعملاء</span>
                      </li>
                    )}
                    {plan.hasWhatsappNotifications && (
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>إشعارات واتساب</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
                
                <CardFooter className="pb-8">
                  <Link href="/start" className="w-full">
                    <Button className="w-full h-12 text-lg" variant={plan.isRecommended ? "default" : "outline"}>
                      ابدأ الآن
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
