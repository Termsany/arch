import { useState } from "react";
import { useGetActivePlans } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Building2, CheckCircle2, CreditCard, KeyRound, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { parseApiResponse } from "@/lib/api-response";

type CreatedOffice = {
  office: { id: number; officeName: string; subscriptionEnd?: string | null };
  user: { email: string };
  trialDays: number;
};

export default function Start() {
  const { data: plans, isLoading } = useGetActivePlans();
  const [created, setCreated] = useState<CreatedOffice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    office_name: "",
    owner_name: "",
    phone: "",
    email: "",
    password: "",
    plan_id: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/create-office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan_id: Number(form.plan_id) }),
      });
      const data = await parseApiResponse<CreatedOffice>(res);
      setCreated(data);
      toast({ title: "تم إنشاء حساب المكتب بنجاح" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إنشاء الحساب", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/pricing" className="flex items-center gap-2 text-xl font-bold text-primary">
            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-secondary-foreground">A</div>
            ArchSaaS
          </Link>
          <Link href="/login">
            <Button variant="ghost">تسجيل الدخول</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">ابدأ استخدام النظام</h1>
          <p className="text-muted-foreground mt-2">أنشئ مكتبك وابدأ التجربة المجانية خلال دقائق.</p>
        </div>

        {created ? (
          <Card className="max-w-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                <div>
                  <h2 className="text-2xl font-bold">تم إنشاء الحساب</h2>
                  <p className="text-muted-foreground">تم إنشاء حساب المكتب بنجاح</p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="font-medium">{created.office.officeName}</p>
                <p className="text-sm text-muted-foreground">يمكنك الآن تسجيل الدخول باستخدام: {created.user.email}</p>
                <p className="text-sm text-muted-foreground">مدة التجربة المجانية 14 يوم</p>
              </div>
              <Link href="/login">
                <Button size="lg">تسجيل الدخول</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> بيانات المكتب</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المكتب</Label>
                    <Input required value={form.office_name} onChange={(e) => setForm({ ...form, office_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المالك</Label>
                    <Input required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserRound className="w-5 h-5" /> إنشاء حساب المدير</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <Input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> اختيار الخطة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <RadioGroup value={form.plan_id} onValueChange={(value) => setForm({ ...form, plan_id: value })} required>
                    {plans?.map((plan) => (
                      <Label key={plan.id} className="block cursor-pointer rounded-lg border p-4 hover:bg-muted/40">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={String(plan.id)} className="mt-1" />
                          <div className="space-y-1">
                            <p className="font-semibold">{plan.nameAr}</p>
                            <p className="text-sm text-muted-foreground">{plan.descriptionAr}</p>
                            <p className="text-sm">التجربة المجانية: 14 يوم</p>
                          </div>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !form.plan_id}>
                  <KeyRound className="w-4 h-4" />
                  {isSubmitting ? "جار إنشاء الحساب..." : "ابدأ استخدام النظام"}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
}
