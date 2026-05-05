import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/invoices";
import { parseApiResponse } from "@/lib/api-response";
import { fetchReport, type ReportData, type ReportFilters, type ReportKey } from "@/lib/reports";
import { BarChart3, BriefcaseBusiness, CalendarDays, Database, FileText, FolderOpen, ListChecks, Users, WalletCards } from "lucide-react";

type OfficeOption = {
  id: number;
  officeName: string;
};

type CountRow = {
  key?: string;
  count?: number;
  name?: string;
  month?: string;
  total?: number;
  storage_mb?: number;
  [key: string]: unknown;
};

const reportTabs: Array<{ key: ReportKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "overview", label: "تقرير عام", icon: BarChart3 },
  { key: "projects", label: "المشاريع", icon: FolderOpen },
  { key: "clients", label: "العملاء", icon: Users },
  { key: "workflow", label: "المراحل", icon: BriefcaseBusiness },
  { key: "finance", label: "المالي", icon: WalletCards },
  { key: "tasks", label: "المهام", icon: ListChecks },
  { key: "storage", label: "التخزين", icon: Database },
];

const invoiceStatusLabels: Record<string, string> = {
  draft: "مسودة",
  sent: "مرسلة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغية",
};

const taskStatusLabels: Record<string, string> = {
  todo: "مطلوب",
  in_progress: "جاري العمل",
  review: "مراجعة",
  done: "مكتملة",
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const visibilityLabels: Record<string, string> = {
  internal: "داخلي",
  client_visible: "ظاهر للعميل",
};

function asRows(value: unknown): CountRow[] {
  return Array.isArray(value) ? value.filter((item): item is CountRow => typeof item === "object" && item !== null) : [];
}

function text(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function label(value: unknown) {
  const raw = text(value);
  return invoiceStatusLabels[raw] ?? taskStatusLabels[raw] ?? priorityLabels[raw] ?? visibilityLabels[raw] ?? raw;
}

function number(value: unknown) {
  return Number(value ?? 0);
}

function money(value: unknown) {
  return formatAmount(number(value));
}

function mb(value: unknown) {
  return `${number(value).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} MB`;
}

function maxCount(rows: CountRow[]) {
  return Math.max(1, ...rows.map((row) => number(row.count ?? row.total ?? row.storage_mb)));
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return <div className="py-8 text-center text-muted-foreground">لا توجد بيانات</div>;
}

function CountTable({ title, rows, nameLabel = "البند" }: { title: string; rows: CountRow[]; nameLabel?: string }) {
  const max = maxCount(rows);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{nameLabel}</TableHead>
                <TableHead>العدد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const count = number(row.count);
                return (
                  <TableRow key={`${text(row.key ?? row.name ?? row.month)}-${index}`}>
                    <TableCell className="font-medium">{label(row.key ?? row.name ?? row.month)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span>{count.toLocaleString("ar-EG")}</span>
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.max(6, (count / max) * 100)}%` }} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ListTable({ title, rows, columns }: { title: string; rows: CountRow[]; columns: Array<{ key: string; label: string; format?: (value: unknown, row: CountRow) => React.ReactNode }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${title}-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.format ? column.format(row[column.key], row) : text(row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewSection({ data }: { data: ReportData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <MetricCard title="إجمالي العملاء" value={number(data.total_clients).toLocaleString("ar-EG")} icon={Users} />
      <MetricCard title="إجمالي المشاريع" value={number(data.total_projects).toLocaleString("ar-EG")} icon={FolderOpen} />
      <MetricCard title="المشاريع الجارية" value={number(data.active_projects).toLocaleString("ar-EG")} icon={BriefcaseBusiness} />
      <MetricCard title="المشاريع المكتملة" value={number(data.completed_projects).toLocaleString("ar-EG")} icon={FileText} />
      <MetricCard title="في انتظار موافقة العميل" value={number(data.waiting_client_approval_projects).toLocaleString("ar-EG")} icon={CalendarDays} />
      <MetricCard title="إجمالي المقايسات" value={money(data.total_boq_value)} icon={FileText} />
      <MetricCard title="إجمالي الفواتير" value={money(data.total_invoice_value)} icon={WalletCards} />
      <MetricCard title="إجمالي المدفوع" value={money(data.total_paid_amount)} icon={WalletCards} />
      <MetricCard title="إجمالي المستحق" value={money(data.total_outstanding_amount)} icon={WalletCards} />
      <MetricCard title="الفواتير المتأخرة" value={number(data.overdue_invoices_count).toLocaleString("ar-EG")} icon={CalendarDays} />
      <MetricCard title="المهام المفتوحة" value={number(data.open_tasks_count).toLocaleString("ar-EG")} icon={ListChecks} />
      <MetricCard title="مساحة التخزين المستخدمة" value={mb(data.storage_used_mb)} icon={Database} />
    </div>
  );
}

function ProjectsSection({ data }: { data: ReportData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CountTable title="حسب الحالة" rows={asRows(data.projects_by_status)} />
      <CountTable title="حسب نوع التصميم" rows={asRows(data.projects_by_design_type)} />
      <CountTable title="حسب الشهر" rows={asRows(data.projects_created_per_month)} nameLabel="الشهر" />
      <CountTable title="المشاريع المكتملة حسب الشهر" rows={asRows(data.completed_projects_per_month)} nameLabel="الشهر" />
      <ListTable title="في انتظار موافقة العميل" rows={asRows(data.projects_waiting_client_approval)} columns={[
        { key: "project_name", label: "المشروع" },
        { key: "client_name", label: "العميل" },
        { key: "project_status", label: "الحالة", format: (value) => <Badge variant="outline">{label(value)}</Badge> },
      ]} />
      <ListTable title="طلبات التعديل" rows={asRows(data.projects_with_revision_requests)} columns={[
        { key: "project_name", label: "المشروع" },
        { key: "client_name", label: "العميل" },
        { key: "project_status", label: "الحالة", format: (value) => <Badge variant="outline">{label(value)}</Badge> },
      ]} />
    </div>
  );
}

function ClientsSection({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="إجمالي العملاء" value={number(data.total_clients).toLocaleString("ar-EG")} icon={Users} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CountTable title="العملاء الجدد حسب الشهر" rows={asRows(data.new_clients_per_month)} nameLabel="الشهر" />
        <ListTable title="أكثر العملاء نشاطاً" rows={asRows(data.clients_with_most_projects)} columns={[
          { key: "name", label: "العميل" },
          { key: "phone", label: "الهاتف" },
          { key: "projects_count", label: "عدد المشاريع", format: (value) => number(value).toLocaleString("ar-EG") },
        ]} />
        <ListTable title="عملاء لديهم موافقات معلقة" rows={asRows(data.clients_with_pending_approvals)} columns={[
          { key: "name", label: "العميل" },
          { key: "projects_count", label: "عدد المشاريع", format: (value) => number(value).toLocaleString("ar-EG") },
        ]} />
        <ListTable title="عملاء لديهم فواتير غير مدفوعة" rows={asRows(data.clients_with_unpaid_invoices)} columns={[
          { key: "name", label: "العميل" },
          { key: "invoices_count", label: "عدد الفواتير", format: (value) => number(value).toLocaleString("ar-EG") },
          { key: "total", label: "إجمالي المستحق", format: money },
        ]} />
      </div>
    </div>
  );
}

function WorkflowSection({ data }: { data: ReportData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CountTable title="حسب الحالة" rows={asRows(data.stages_by_status)} />
      <CountTable title="أكثر مراحل طلب التعديل" rows={asRows(data.most_common_revision_stages)} />
      <ListTable title="مراحل في انتظار موافقة العميل" rows={asRows(data.stages_waiting_approval)} columns={[
        { key: "project_name", label: "المشروع" },
        { key: "stage_name", label: "المرحلة" },
        { key: "status", label: "الحالة", format: (value) => <Badge variant="outline">{label(value)}</Badge> },
      ]} />
      <ListTable title="مراحل تحتاج تعديل" rows={asRows(data.stages_needing_revision)} columns={[
        { key: "project_name", label: "المشروع" },
        { key: "stage_name", label: "المرحلة" },
        { key: "status", label: "الحالة", format: (value) => <Badge variant="outline">{label(value)}</Badge> },
      ]} />
      <ListTable title="مشاريع متوقفة بسبب موافقة العميل" rows={asRows(data.projects_blocked_by_client_approval)} columns={[
        { key: "project_name", label: "المشروع" },
        { key: "client_name", label: "العميل" },
      ]} />
      <Card>
        <CardHeader><CardTitle className="text-lg">متوسط زمن إنهاء المرحلة</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">غير متاح حالياً لعدم كفاية timestamps دقيقة.</CardContent>
      </Card>
    </div>
  );
}

function FinanceSection({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="إجمالي الفواتير" value={money(data.total_invoice_value)} icon={WalletCards} />
        <MetricCard title="إجمالي المدفوع" value={money(data.total_paid_amount)} icon={WalletCards} />
        <MetricCard title="إجمالي المستحق" value={money(data.total_outstanding_amount)} icon={WalletCards} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CountTable title="حسب الحالة" rows={asRows(data.invoices_by_status)} />
        <ListTable title="الفواتير المتأخرة" rows={asRows(data.overdue_invoices)} columns={[
          { key: "invoice_number", label: "رقم الفاتورة" },
          { key: "client_name", label: "العميل" },
          { key: "project_name", label: "المشروع" },
          { key: "outstanding_amount", label: "المتبقي", format: money },
        ]} />
        <ListTable title="المدفوعات حسب الشهر" rows={asRows(data.payments_per_month)} columns={[
          { key: "month", label: "الشهر" },
          { key: "total", label: "الإجمالي", format: money },
        ]} />
        <ListTable title="إجمالي الفواتير حسب الشهر" rows={asRows(data.invoice_totals_per_month)} columns={[
          { key: "month", label: "الشهر" },
          { key: "total", label: "الإجمالي", format: money },
        ]} />
        <ListTable title="أكثر المشاريع إيراداً" rows={asRows(data.top_projects_by_revenue)} columns={[
          { key: "project_name", label: "المشروع" },
          { key: "total", label: "الإيراد", format: money },
        ]} />
        <ListTable title="أكثر العملاء إيراداً" rows={asRows(data.top_clients_by_revenue)} columns={[
          { key: "name", label: "العميل" },
          { key: "total", label: "الإيراد", format: money },
        ]} />
      </div>
    </div>
  );
}

function TasksSection({ data }: { data: ReportData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CountTable title="حسب الحالة" rows={asRows(data.tasks_by_status)} />
      <CountTable title="حسب الأولوية" rows={asRows(data.tasks_by_priority)} />
      <ListTable title="حسب المسؤول" rows={asRows(data.tasks_by_assignee)} columns={[
        { key: "name", label: "المسؤول" },
        { key: "count", label: "العدد", format: (value) => number(value).toLocaleString("ar-EG") },
      ]} />
      <CountTable title="المهام المكتملة حسب الشهر" rows={asRows(data.completed_tasks_per_month)} nameLabel="الشهر" />
      <ListTable title="المهام المتأخرة" rows={asRows(data.overdue_tasks)} columns={[
        { key: "title", label: "المهمة" },
        { key: "project_name", label: "المشروع" },
        { key: "assigned_to_name", label: "المسؤول" },
        { key: "priority", label: "الأولوية", format: (value) => <Badge variant="outline">{label(value)}</Badge> },
        { key: "due_date", label: "تاريخ التسليم" },
      ]} />
      <ListTable title="مهام هذا الأسبوع" rows={asRows(data.tasks_due_this_week)} columns={[
        { key: "title", label: "المهمة" },
        { key: "project_name", label: "المشروع" },
        { key: "assigned_to_name", label: "المسؤول" },
        { key: "due_date", label: "تاريخ التسليم" },
      ]} />
    </div>
  );
}

function StorageSection({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="إجمالي الملفات" value={number(data.total_files).toLocaleString("ar-EG")} icon={FileText} />
        <MetricCard title="مساحة التخزين المستخدمة" value={mb(data.storage_used_mb)} icon={Database} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ListTable title="حسب التصنيف" rows={asRows(data.files_by_category)} columns={[
          { key: "category", label: "التصنيف" },
          { key: "count", label: "العدد", format: (value) => number(value).toLocaleString("ar-EG") },
          { key: "storage_mb", label: "المساحة", format: mb },
        ]} />
        <ListTable title="حسب المشروع" rows={asRows(data.storage_by_project)} columns={[
          { key: "project_name", label: "المشروع" },
          { key: "files_count", label: "عدد الملفات", format: (value) => number(value).toLocaleString("ar-EG") },
          { key: "storage_mb", label: "المساحة", format: mb },
        ]} />
        <ListTable title="حسب الظهور" rows={asRows(data.storage_by_visibility)} columns={[
          { key: "visibility", label: "الظهور", format: (value) => label(value) },
          { key: "count", label: "العدد", format: (value) => number(value).toLocaleString("ar-EG") },
          { key: "storage_mb", label: "المساحة", format: mb },
        ]} />
        <ListTable title="أكبر الملفات" rows={asRows(data.largest_files)} columns={[
          { key: "original_name", label: "الملف" },
          { key: "project_name", label: "المشروع" },
          { key: "file_category", label: "التصنيف" },
          { key: "storage_mb", label: "المساحة", format: mb },
        ]} />
      </div>
    </div>
  );
}

function renderReport(report: ReportKey, data: ReportData) {
  if (report === "overview") return <OverviewSection data={data} />;
  if (report === "projects") return <ProjectsSection data={data} />;
  if (report === "clients") return <ClientsSection data={data} />;
  if (report === "workflow") return <WorkflowSection data={data} />;
  if (report === "finance") return <FinanceSection data={data} />;
  if (report === "tasks") return <TasksSection data={data} />;
  return <StorageSection data={data} />;
}

export default function Reports() {
  const { user } = useAuth();
  const isSuperAdmin = (user as { role?: string } | null)?.role === "super_admin";
  const [activeReport, setActiveReport] = useState<ReportKey>("overview");
  const [draftFilters, setDraftFilters] = useState<ReportFilters>({});
  const [filters, setFilters] = useState<ReportFilters>({});
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [offices, setOffices] = useState<OfficeOption[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/offices", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => parseApiResponse<OfficeOption[]>(res))
      .then(setOffices)
      .catch(() => setOffices([]));
  }, [isSuperAdmin]);

  useEffect(() => {
    setIsLoading(true);
    fetchReport(activeReport, filters)
      .then(setData)
      .catch((err) => {
        setData(null);
        toast({ title: err instanceof Error ? err.message : "تعذر تحميل التقرير", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [activeReport, filters]);

  const currentTitle = useMemo(() => reportTabs.find((tab) => tab.key === activeReport)?.label ?? "التقارير", [activeReport]);

  const applyFilters = () => {
    setFilters(draftFilters);
  };

  return (
    <AppLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">التقارير</h1>
          <p className="text-muted-foreground mt-1">تقارير بسيطة وسريعة عن المشاريع، العملاء، المراحل، المالي، المهام، والتخزين</p>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="from-date">من تاريخ</Label>
              <Input id="from-date" type="date" value={draftFilters.from_date ?? ""} onChange={(e) => setDraftFilters((prev) => ({ ...prev, from_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">إلى تاريخ</Label>
              <Input id="to-date" type="date" value={draftFilters.to_date ?? ""} onChange={(e) => setDraftFilters((prev) => ({ ...prev, to_date: e.target.value }))} />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>المكتب</Label>
                <Select value={draftFilters.office_id ?? "all"} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, office_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل المكاتب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المكاتب</SelectItem>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={String(office.id)}>{office.officeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={applyFilters} className="gap-2">
              <CalendarDays className="w-4 h-4" />
              تطبيق الفلتر
            </Button>
          </CardContent>
        </Card>

        <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as ReportKey)} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-muted/50 p-2">
            {reportTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {reportTabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  {tab.key === "overview" ? "تقرير عام" : tab.key === "finance" ? "التقرير المالي" : `تقرير ${currentTitle}`}
                </h2>
                <Badge variant="outline">بيانات معزولة حسب المكتب</Badge>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-28 w-full" />)}
                </div>
              ) : data ? (
                renderReport(tab.key, data)
              ) : (
                <Card><CardContent><EmptyState /></CardContent></Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
