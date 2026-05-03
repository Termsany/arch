import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useClientAuth } from "@/hooks/use-client-auth";
import { getClientProjects, type ClientProject } from "@/lib/client-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { FolderOpen, LogOut, ArrowLeft, CalendarDays, Ruler } from "lucide-react";

function statusColor(status: string) {
  if (status === "مكتمل" || status === "مكتملة") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "جاري التنفيذ" || status === "جاري العمل") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "في انتظار الموافقة") return "bg-orange-100 text-orange-800 border-orange-200";
  if (status === "متوقف") return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-muted text-muted-foreground border-border";
}

export default function ClientPortalDashboard() {
  const { clientUser, logoutClient } = useClientAuth();
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getClientProjects()
      .then(setProjects)
      .catch(() => toast({ title: "تعذّر تحميل المشاريع", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">A</div>
            <span className="font-bold text-primary hidden sm:block">ArchSaaS</span>
            <span className="text-muted-foreground text-sm">/ بوابة العملاء</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium hidden sm:block">{clientUser?.name}</span>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={logoutClient}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            مشاريعي
          </h1>
          <p className="text-muted-foreground mt-1">تتبع تقدم مشاريع التصميم الخاصة بك</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">لا توجد مشاريع مرتبطة بحسابك حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-md transition-shadow cursor-pointer border-border/60"
                onClick={() => setLocation(`/client/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold leading-tight">{project.projectName}</CardTitle>
                    <Badge variant="outline" className={`text-xs shrink-0 ${statusColor(project.projectStatus)}`}>
                      {project.projectStatus}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.designType}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    {project.startDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span dir="ltr">{new Date(project.startDate).toLocaleDateString("en-GB")}</span>
                      </span>
                    )}
                    {project.areaMeters && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3.5 h-3.5" />
                        <span dir="ltr">{project.areaMeters} m²</span>
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <span>عرض التفاصيل</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
