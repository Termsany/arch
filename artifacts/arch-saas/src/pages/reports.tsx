import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { BarChart3 } from "lucide-react";

type ReportKey = "overview" | "projects" | "clients" | "workflow" | "finance" | "tasks" | "storage";
type Row = Record<string, unknown>;

const tabs: Array<{ key: ReportKey; label: string; title: string }> = [
  { key: "overview", label: "تقرير عام", title: "تقرير عام" },
  { key: "projects", label: "المشاريع", title: "تقرير المشاريع" },
  { key: "clients", label: "العملاء", title: "تقرير العملاء" },
  { key: "workflow", label: "المراحل", title: "تقرير المراحل" },
  { key: "finance", label: "المالي", title: "التقرير المالي" },
  { key: "tasks", label: "المهام", title: "تقرير المهام" },
  { key: "storage", label: "التخزين", title: "تقرير التخزين" },
];

const overviewLabels: Record<string, string> = {
  total_clients: "إجمالي العملاء",
  total_projects: "إجمالي المشاريع",
  active_projects: "المشاريع الجارية",
  completed_projects: "المشاريع المكتملة",
  waiting_client_approval_projects: "في انتظار موافقة العميل",
  total_boq_value: "إجمالي المقايسات",
  total_invoice_value: "إجمالي الفواتير",
  total_paid_amount: "إجمالي المدفوع",
  total_outstanding_amount: "إجمالي المستحق",
  overdue_invoices_count: "الفواتير المتأخرة",
  open_tasks_count: "المهام المفتوحة",
  overdue_tasks_count: "المهام المتأخرة",
  storage_used_mb: "مساحة التخزين المستخدمة",
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function valueText(value: unknown) {
  if (typeof value === "number") return value.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
  return String(value ?? "-");
}

function DataTable({ rows, columns }: { rows: Row[]; columns?: Array<{ key: string; label: string }> }) {
  const cols = columns || Object.keys(rows[0] || {}).map((key) => ({ key, label: key }));
  if (!rows.length) return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>;
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>{cols.map((col) => <TableHead key={col.key} className="text-right">{col.label}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>{cols.map((col) => <TableCell key={col.key}>{valueText(row[col.key])}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MetricList({ title, data }: { title: string; data: Row[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><DataTable rows={data} columns={[{ key: "label", label: "البند" }, { key: "value", label: "القيمة" }]} /></CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isSuperAdmin = (user as { role?: string } | null)?.role === "super_admin";
  const [active, setActive] = useState<ReportKey>("overview");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [officeId, setOfficeId] = useState("all");
  const [offices, setOffices] = useState<Row[]>([]);
  const [reports, setReports] = useState<Partial<Record<ReportKey, Row>>>({});
  const [loading, setLoading] = useState(false);

  const load = async (key = active) => {
    setLoading(true);
    const query = new URLSearchParams();
    if (fromDate) query.set("from_date", fromDate);
    if (toDate) query.set("to_date", toDate);
    if (isSuperAdmin && officeId !== "all") query.set("office_id", officeId);
    try {
      const res = await fetch(`/api/reports/${key}?${query.toString()}`, { headers: authHeaders() });
      const body = await res.json();
      if (!body.success) throw new Error(body.message || "تعذر تحميل التقرير");
      setReports((current) => ({ ...current, [key]: body.data }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(active); }, [active]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/offices", { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setOffices(Array.isArray(data) ? data : data.data || []))
      .catch(() => setOffices([]));
  }, [isSuperAdmin]);

  const report = reports[active] || {};

  return (
    <AppLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">التقارير</h1>
            <p className="text-muted-foreground mt-1">لوحات تحليل بسيطة وسريعة حسب المكتب والفترة</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2"><Label>من تاريخ</Label><Input type="date" dir="ltr" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>إلى تاريخ</Label><Input type="date" dir="ltr" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>المكتب</Label>
                <Select value={officeId} onValueChange={setOfficeId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل المكاتب</SelectItem>
                    {offices.map((office) => <SelectItem key={String(office.id)} value={String(office.id)}>{String(office.officeName || office.office_name || office.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => load(active)} disabled={loading}>تطبيق الفلتر</Button>
          </CardContent>
        </Card>

        <Tabs value={active} onValueChange={(value) => setActive(value as ReportKey)}>
          <TabsList className="grid grid-cols-2 md:grid-cols-7 h-auto">
            {tabs.map((tab) => <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {loading ? <Skeleton className="h-80 w-full" /> : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(overviewLabels).map(([key, label]) => (
                  <Card key={key}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{valueText(report[key])}</p></CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricList title="حسب الحالة" data={(report.projects_by_status as Row[]) || []} />
            <MetricList title="حسب نوع التصميم" data={(report.projects_by_design_type as Row[]) || []} />
            <Card><CardHeader><CardTitle className="text-base">حسب الشهر</CardTitle></CardHeader><CardContent><DataTable rows={(report.projects_created_per_month as Row[]) || []} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">في انتظار موافقة العميل</CardTitle></CardHeader><CardContent><DataTable rows={(report.projects_waiting_client_approval as Row[]) || []} /></CardContent></Card>
          </TabsContent>

          <TabsContent value="clients" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">إجمالي العملاء</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{valueText(report.total_clients)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">حسب الشهر</CardTitle></CardHeader><CardContent><DataTable rows={(report.new_clients_per_month as Row[]) || []} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">أكثر العملاء نشاطاً</CardTitle></CardHeader><CardContent><DataTable rows={(report.clients_with_most_projects as Row[]) || []} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">عملاء لديهم مستحقات</CardTitle></CardHeader><CardContent><DataTable rows={(report.clients_with_unpaid_invoices as Row[]) || []} /></CardContent></Card>
          </TabsContent>

          <TabsContent value="workflow" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricList title="حسب الحالة" data={(report.stages_by_status as Row[]) || []} />
            <Card><CardHeader><CardTitle className="text-base">في انتظار موافقة العميل</CardTitle></CardHeader><CardContent><DataTable rows={(report.stages_waiting_approval as Row[]) || []} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">مراحل تحتاج تعديل</CardTitle></CardHeader><CardContent><DataTable rows={(report.stages_needing_revision as Row[]) || []} /></CardContent></Card>
            <MetricList title="أكثر مراحل التعديل" data={(report.most_common_revision_stages as Row[]) || []} />
          </TabsContent>

          <TabsContent value="finance" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricList title="حسب الحالة" data={(report.invoices_by_status as Row[]) || []} />
            <Card><CardHeader><CardTitle className="text-base">الملخص المالي</CardTitle></CardHeader><CardContent><DataTable rows={[{ label: "إجمالي الفواتير", value: report.total_invoice_value }, { label: "إجمالي المدفوع", value: report.total_paid_amount }, { label: "إجمالي المستحق", value: report.total_outstanding_amount }]} columns={[{ key: "label", label: "البند" }, { key: "value", label: "القيمة" }]} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">أكثر المشاريع إيراداً</CardTitle></CardHeader><CardContent><DataTable rows={(report.top_projects_by_revenue as Row[]) || []} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">الفواتير المتأخرة</CardTitle></CardHeader><CardContent><DataTable rows={(report.overdue_invoices as Row[]) || []} /></CardContent></Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricList title="حسب الحالة" data={(report.tasks_by_status as Row[]) || []} />
            <MetricList title="حسب الأولوية" data={(report.tasks_by_priority as Row[]) || []} />
            <MetricList title="حسب المسؤول" data={(report.tasks_by_assignee as Row[]) || []} />
            <Card><CardHeader><CardTitle className="text-base">المهام المتأخرة</CardTitle></CardHeader><CardContent><DataTable rows={(report.overdue_tasks as Row[]) || []} /></CardContent></Card>
          </TabsContent>

          <TabsContent value="storage" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">مساحة التخزين المستخدمة</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{valueText(report.storage_used_mb)} MB</p></CardContent></Card>
            <MetricList title="حسب التصنيف" data={(report.files_by_category as Row[]) || []} />
            <Card><CardHeader><CardTitle className="text-base">أكبر الملفات</CardTitle></CardHeader><CardContent><DataTable rows={(report.largest_files as Row[]) || []} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">حسب المشروع</CardTitle></CardHeader><CardContent><DataTable rows={(report.storage_by_project as Row[]) || []} /></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
