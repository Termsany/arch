import { useEffect, useState } from "react";
import { useGetDashboardStats, useGetRecentProjects, useGetPendingApprovals, useGetRecentOffices } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderOpen, Clock, CheckCircle2, AlertCircle, CreditCard, PlayCircle, Building2, Activity, ListChecks, ClipboardList, CalendarDays, Receipt, WalletCards, CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { parseApiResponse } from "@/lib/api-response";
import { fetchTaskStats, type TaskStats } from "@/lib/tasks";
import { fetchFinanceStats, formatAmount, type FinanceStats } from "@/lib/invoices";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentProjects, isLoading: projectsLoading } = useGetRecentProjects();
  const { data: pendingApprovals, isLoading: pendingLoading } = useGetPendingApprovals();
  const { data: recentOffices, isLoading: officesLoading } = useGetRecentOffices();
  const [showChecklist, setShowChecklist] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/status", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    })
      .then((res) => parseApiResponse<{ onboardingCompleted: boolean }>(res))
      .then((data) => setShowChecklist(!data.onboardingCompleted))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchTaskStats().then(setTaskStats).catch(() => setTaskStats(null));
    fetchFinanceStats().then(setFinanceStats).catch(() => setFinanceStats(null));
  }, []);

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      await parseApiResponse(res);
      setShowChecklist(false);
      toast({ title: "تم إنهاء قائمة البداية" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إنهاء قائمة البداية", variant: "destructive" });
    } finally {
      setIsCompleting(false);
    }
  };

  const statCards = [
    { title: "إجمالي العملاء", value: stats?.totalClients, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "إجمالي المشاريع", value: stats?.totalProjects, icon: FolderOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "المشاريع الجارية", value: stats?.activeProjects, icon: PlayCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "في انتظار موافقة العميل", value: stats?.projectsWaitingApproval, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "مهامي", value: taskStats?.myTasks, icon: ClipboardList, color: "text-sky-500", bg: "bg-sky-500/10" },
    { title: "المهام المتأخرة", value: taskStats?.overdueTasks, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "مهام هذا الأسبوع", value: taskStats?.thisWeekTasks, icon: CalendarDays, color: "text-lime-600", bg: "bg-lime-500/10" },
    { title: "إجمالي الفواتير", value: financeStats ? formatAmount(financeStats.totalInvoices) : undefined, icon: Receipt, color: "text-cyan-600", bg: "bg-cyan-500/10" },
    { title: "إجمالي المدفوع", value: financeStats ? formatAmount(financeStats.totalPaid) : undefined, icon: WalletCards, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { title: "إجمالي المستحق", value: financeStats ? formatAmount(financeStats.totalDue) : undefined, icon: CircleDollarSign, color: "text-amber-600", bg: "bg-amber-500/10" },
    { title: "الفواتير المتأخرة", value: financeStats?.overdueInvoices, icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10" },
    { title: "المشاريع المكتملة", value: stats?.completedProjects, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "خطط الاشتراك", value: stats?.totalPlans, icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "الخطط النشطة", value: stats?.activePlans, icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "إجمالي المكاتب", value: stats?.totalOffices, icon: Building2, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "الاشتراكات النشطة", value: stats?.activeSubscriptions, icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-500/10" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على أداء نظام إدارة المشاريع</p>
        </div>

        {showChecklist && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                قائمة البداية
              </CardTitle>
              <Button onClick={completeOnboarding} disabled={isCompleting} variant="outline">
                إنهاء قائمة البداية
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {["أضف أول عميل", "أنشئ أول مشروع", "ارفع ملفات المشروع", "أضف بنود المقايسة", "ادعُ العميل للبوابة"].map((item) => (
                  <div key={item} className="rounded-lg border bg-background p-3 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold">{stat.value ?? 0}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">أحدث المشاريع</CardTitle>
              <Link href="/projects" className="text-sm text-primary hover:underline">عرض الكل</Link>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4 mt-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentProjects?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد مشاريع حديثة</div>
              ) : (
                <div className="divide-y mt-4">
                  {recentProjects?.map(project => (
                    <div key={project.id} className="py-4 flex justify-between items-center">
                      <div>
                        <Link href={`/projects/${project.id}`} className="font-medium hover:text-primary transition-colors">
                          {project.projectName}
                        </Link>
                        <p className="text-sm text-muted-foreground">{project.clientName}</p>
                      </div>
                      <Badge variant="outline" className="font-normal">{project.projectStatus}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">في انتظار موافقة العميل</CardTitle>
              <Link href="/projects" className="text-sm text-primary hover:underline">عرض الكل</Link>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-4 mt-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : pendingApprovals?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد مشاريع في انتظار الموافقة</div>
              ) : (
                <div className="divide-y mt-4">
                  {pendingApprovals?.map(project => (
                    <div key={project.id} className="py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <div>
                          <Link href={`/projects/${project.id}`} className="font-medium hover:text-primary transition-colors">
                            {project.projectName}
                          </Link>
                          <p className="text-sm text-muted-foreground">{project.clientName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
