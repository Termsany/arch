import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserRound, ArrowLeft, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8">
        <header className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">ArchSaaS</h1>
            <p className="mt-2 text-muted-foreground">نظام إدارة مشاريع التصميم المعماري والداخلي</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>دخول المكتب</CardTitle>
                <CardDescription className="mt-2">للمديرين وفريق العمل داخل المكتب</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full gap-2">
                <Link href="/login">
                  دخول المكتب
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>دخول العميل</CardTitle>
                <CardDescription className="mt-2">لمتابعة المشاريع والموافقات والملفات</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full gap-2">
                <Link href="/client/login">
                  دخول العميل
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            مكتب جديد؟
          </span>
          <Link href="/start" className="font-medium text-primary hover:underline">ابدأ استخدام النظام</Link>
          <span className="hidden sm:inline">|</span>
          <Link href="/pricing" className="font-medium text-primary hover:underline">عرض الخطط</Link>
        </div>
      </div>
    </div>
  );
}
