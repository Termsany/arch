import { useGetDashboardStats, useGetRecentProjects, useGetPendingApprovals, useGetRecentOffices } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderOpen, Clock, CheckCircle2, AlertCircle, CreditCard, PlayCircle, Building2, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentProjects, isLoading: projectsLoading } = useGetRecentProjects();
  const { data: pendingApprovals, isLoading: pendingLoading } = useGetPendingApprovals();
  const { data: recentOffices, isLoading: officesLoading } = useGetRecentOffices();

  const statCards = [
    { title: "إجمالي العملاء", value: stats?.totalClients, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "إجمالي المشاريع", value: stats?.totalProjects, icon: FolderOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "المشاريع الجارية", value: stats?.activeProjects, icon: PlayCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "في انتظار موافقة العميل", value: stats?.projectsWaitingApproval, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
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
