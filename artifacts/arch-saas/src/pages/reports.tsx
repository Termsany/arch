import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
import { parseApiResponse } from "@/lib/api-response";
import { fetchReport, type ReportData, type ReportFilters, type ReportKey } from "@/lib/reports";
import { BarChart3, BriefcaseBusiness, CalendarDays, Database, FileText, FolderOpen, ListChecks, Users, WalletCards } from "lucide-react";
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";

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

const reportTabs: Array<{ key: ReportKey; labelKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "overview", labelKey: "reports.overview", icon: BarChart3 },
  { key: "projects", labelKey: "reports.projects", icon: FolderOpen },
  { key: "clients", labelKey: "reports.clients", icon: Users },
  { key: "workflow", labelKey: "reports.workflow", icon: BriefcaseBusiness },
  { key: "finance", labelKey: "reports.finance", icon: WalletCards },
  { key: "tasks", labelKey: "reports.tasks", icon: ListChecks },
  { key: "storage", labelKey: "reports.storage", icon: Database },
];

const invoiceStatusLabelKeys: Record<string, TranslationKey> = {
  draft: "reports.status.draft",
  sent: "invoice.status.sent",
  partially_paid: "invoice.status.partially_paid",
  paid: "invoice.status.paid",
  overdue: "reports.status.overdue",
  cancelled: "reports.status.cancelled",
};

const taskStatusLabelKeys: Record<string, TranslationKey> = {
  todo: "task.status.todo",
  in_progress: "task.status.in_progress",
  review: "task.status.review",
  done: "task.status.done",
  completed: "reports.status.completed",
  pending: "reports.status.pending",
  active: "reports.status.active",
  inactive: "reports.status.inactive",
};

const priorityLabelKeys: Record<string, TranslationKey> = {
  low: "task.priority.low",
  medium: "task.priority.medium",
  high: "task.priority.high",
  urgent: "task.priority.urgent",
};

const visibilityLabelKeys: Record<string, TranslationKey> = {
  internal: "reports.visibility.internal",
  client_visible: "reports.visibility.clientVisible",
};

function asRows(value: unknown): CountRow[] {
  return Array.isArray(value) ? value.filter((item): item is CountRow => typeof item === "object" && item !== null) : [];
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function label(value: unknown, t: ReportRuntime["t"]) {
  const raw = text(value);
  const key = invoiceStatusLabelKeys[raw] ?? taskStatusLabelKeys[raw] ?? priorityLabelKeys[raw] ?? visibilityLabelKeys[raw];
  if (key) return t(key);
  return raw || t("reports.unspecified");
}

function number(value: unknown) {
  return Number(value ?? 0);
}

function maxCount(rows: CountRow[]) {
  return Math.max(1, ...rows.map((row) => number(row.count ?? row.total ?? row.storage_mb)));
}

type ReportRuntime = {
  t: (key: TranslationKey) => string;
  formatNumber: (value: number | string | null | undefined) => string;
  formatCurrency: (value: number | string | null | undefined) => string;
  formatDate: (value: Date | string | number | null | undefined) => string;
};

const ReportRuntimeContext = createContext<ReportRuntime | null>(null);

function useReportRuntime() {
  const runtime = useContext(ReportRuntimeContext);
  if (!runtime) throw new Error("useReportRuntime must be used within ReportRuntimeContext");
  return runtime;
}

function money(value: unknown, formatCurrency: ReportRuntime["formatCurrency"]) {
  return formatCurrency(number(value));
}

function mb(value: unknown, formatNumber: ReportRuntime["formatNumber"], unit: string) {
  return `${formatNumber(number(value))} ${unit}`;
}

function reportDate(value: unknown, formatDate: ReportRuntime["formatDate"]) {
  return value ? formatDate(value as string | number | Date) : "-";
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
  const { t } = useReportRuntime();
  return <div className="py-8 text-center text-muted-foreground">{t("reports.empty")}</div>;
}

function CountTable({ title, rows, nameLabel }: { title: string; rows: CountRow[]; nameLabel?: string }) {
  const { formatNumber, t } = useReportRuntime();
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
                <TableHead>{nameLabel ?? t("reports.item")}</TableHead>
                <TableHead>{t("reports.count")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const count = number(row.count);
                return (
                  <TableRow key={`${text(row.key ?? row.name ?? row.month)}-${index}`}>
                    <TableCell className="font-medium">{label(row.key ?? row.name ?? row.month, t)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span>{formatNumber(count)}</span>
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
  const { formatCurrency, formatNumber, t } = useReportRuntime();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
      <MetricCard title={t("metric.totalClients")} value={formatNumber(number(data.total_clients))} icon={Users} />
      <MetricCard title={t("metric.totalProjects")} value={formatNumber(number(data.total_projects))} icon={FolderOpen} />
      <MetricCard title={t("metric.activeProjects")} value={formatNumber(number(data.active_projects))} icon={BriefcaseBusiness} />
      <MetricCard title={t("metric.completedProjects")} value={formatNumber(number(data.completed_projects))} icon={FileText} />
      <MetricCard title={t("metric.waitingClientApproval")} value={formatNumber(number(data.waiting_client_approval_projects))} icon={CalendarDays} />
      <MetricCard title={t("reports.totalBoqValue")} value={money(data.total_boq_value, formatCurrency)} icon={FileText} />
      <MetricCard title={t("metric.totalInvoices")} value={money(data.total_invoice_value, formatCurrency)} icon={WalletCards} />
      <MetricCard title={t("metric.totalPaid")} value={money(data.total_paid_amount, formatCurrency)} icon={WalletCards} />
      <MetricCard title={t("metric.totalOutstanding")} value={money(data.total_outstanding_amount, formatCurrency)} icon={WalletCards} />
      <MetricCard title={t("metric.overdueInvoices")} value={formatNumber(number(data.overdue_invoices_count))} icon={CalendarDays} />
      <MetricCard title={t("reports.openTasks")} value={formatNumber(number(data.open_tasks_count))} icon={ListChecks} />
      <MetricCard title={t("metric.storageUsed")} value={mb(data.storage_used_mb, formatNumber, t("reports.storageUnit"))} icon={Database} />
    </div>
  );
}

function ProjectsSection({ data }: { data: ReportData }) {
  const { t } = useReportRuntime();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CountTable title={t("reports.byStatus")} rows={asRows(data.projects_by_status)} />
      <CountTable title={t("reports.byDesignType")} rows={asRows(data.projects_by_design_type)} />
      <CountTable title={t("reports.byMonth")} rows={asRows(data.projects_created_per_month)} nameLabel={t("reports.month")} />
      <CountTable title={t("reports.completedProjectsByMonth")} rows={asRows(data.completed_projects_per_month)} nameLabel={t("reports.month")} />
      <ListTable title={t("reports.projectsWaitingApproval")} rows={asRows(data.projects_waiting_client_approval)} columns={[
        { key: "project_name", label: t("reports.project") },
        { key: "client_name", label: t("reports.client") },
        { key: "project_status", label: t("reports.status"), format: (value) => <Badge variant="outline">{label(value, t)}</Badge> },
      ]} />
      <ListTable title={t("reports.revisionRequests")} rows={asRows(data.projects_with_revision_requests)} columns={[
        { key: "project_name", label: t("reports.project") },
        { key: "client_name", label: t("reports.client") },
        { key: "project_status", label: t("reports.status"), format: (value) => <Badge variant="outline">{label(value, t)}</Badge> },
      ]} />
    </div>
  );
}

function ClientsSection({ data }: { data: ReportData }) {
  const { formatCurrency, formatNumber, t } = useReportRuntime();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title={t("metric.totalClients")} value={formatNumber(number(data.total_clients))} icon={Users} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CountTable title={t("reports.newClientsByMonth")} rows={asRows(data.new_clients_per_month)} nameLabel={t("reports.month")} />
        <ListTable title={t("reports.topActiveClients")} rows={asRows(data.clients_with_most_projects)} columns={[
          { key: "name", label: t("reports.client") },
          { key: "phone", label: t("reports.phone") },
          { key: "projects_count", label: t("reports.projectsCount"), format: (value) => formatNumber(number(value)) },
        ]} />
        <ListTable title={t("reports.clientsPendingApprovals")} rows={asRows(data.clients_with_pending_approvals)} columns={[
          { key: "name", label: t("reports.client") },
          { key: "projects_count", label: t("reports.projectsCount"), format: (value) => formatNumber(number(value)) },
        ]} />
        <ListTable title={t("reports.clientsUnpaidInvoices")} rows={asRows(data.clients_with_unpaid_invoices)} columns={[
          { key: "name", label: t("reports.client") },
          { key: "invoices_count", label: t("reports.invoicesCount"), format: (value) => formatNumber(number(value)) },
          { key: "total", label: t("reports.totalOutstanding"), format: (value) => money(value, formatCurrency) },
        ]} />
      </div>
    </div>
  );
}

function WorkflowSection({ data }: { data: ReportData }) {
  const { t } = useReportRuntime();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CountTable title={t("reports.byStatus")} rows={asRows(data.stages_by_status)} />
      <CountTable title={t("reports.commonRevisionStages")} rows={asRows(data.most_common_revision_stages)} />
      <ListTable title={t("reports.stagesWaitingApproval")} rows={asRows(data.stages_waiting_approval)} columns={[
        { key: "project_name", label: t("reports.project") },
        { key: "stage_name", label: t("reports.stage") },
        { key: "status", label: t("reports.status"), format: (value) => <Badge variant="outline">{label(value, t)}</Badge> },
      ]} />
      <ListTable title={t("reports.stagesNeedRevision")} rows={asRows(data.stages_needing_revision)} columns={[
        { key: "project_name", label: t("reports.project") },
        { key: "stage_name", label: t("reports.stage") },
        { key: "status", label: t("reports.status"), format: (value) => <Badge variant="outline">{label(value, t)}</Badge> },
      ]} />
      <ListTable title={t("reports.projectsBlockedByApproval")} rows={asRows(data.projects_blocked_by_client_approval)} columns={[
        { key: "project_name", label: t("reports.project") },
        { key: "client_name", label: t("reports.client") },
      ]} />
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("reports.averageStageCompletion")}</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">{t("reports.averageStageUnavailable")}</CardContent>
      </Card>
    </div>
  );
}

function FinanceSection({ data }: { data: ReportData }) {
  const { formatCurrency, t } = useReportRuntime();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title={t("metric.totalInvoices")} value={money(data.total_invoice_value, formatCurrency)} icon={WalletCards} />
        <MetricCard title={t("metric.totalPaid")} value={money(data.total_paid_amount, formatCurrency)} icon={WalletCards} />
        <MetricCard title={t("metric.totalOutstanding")} value={money(data.total_outstanding_amount, formatCurrency)} icon={WalletCards} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CountTable title={t("reports.byStatus")} rows={asRows(data.invoices_by_status)} />
        <ListTable title={t("reports.overdueInvoices")} rows={asRows(data.overdue_invoices)} columns={[
          { key: "invoice_number", label: t("reports.invoiceNumber") },
          { key: "client_name", label: t("reports.client") },
          { key: "project_name", label: t("reports.project") },
          { key: "outstanding_amount", label: t("reports.remaining"), format: (value) => money(value, formatCurrency) },
        ]} />
        <ListTable title={t("reports.paymentsByMonth")} rows={asRows(data.payments_per_month)} columns={[
          { key: "month", label: t("reports.month") },
          { key: "total", label: t("reports.total"), format: (value) => money(value, formatCurrency) },
        ]} />
        <ListTable title={t("reports.invoiceTotalsByMonth")} rows={asRows(data.invoice_totals_per_month)} columns={[
          { key: "month", label: t("reports.month") },
          { key: "total", label: t("reports.total"), format: (value) => money(value, formatCurrency) },
        ]} />
        <ListTable title={t("reports.topProjectsByRevenue")} rows={asRows(data.top_projects_by_revenue)} columns={[
          { key: "project_name", label: t("reports.project") },
          { key: "total", label: t("reports.revenue"), format: (value) => money(value, formatCurrency) },
        ]} />
        <ListTable title={t("reports.topClientsByRevenue")} rows={asRows(data.top_clients_by_revenue)} columns={[
          { key: "name", label: t("reports.client") },
          { key: "total", label: t("reports.revenue"), format: (value) => money(value, formatCurrency) },
        ]} />
      </div>
    </div>
  );
}

function TasksSection({ data }: { data: ReportData }) {
  const { formatDate, formatNumber, t } = useReportRuntime();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CountTable title={t("reports.byStatus")} rows={asRows(data.tasks_by_status)} />
      <CountTable title={t("reports.byPriority")} rows={asRows(data.tasks_by_priority)} />
      <ListTable title={t("reports.byAssignee")} rows={asRows(data.tasks_by_assignee)} columns={[
        { key: "name", label: t("reports.assignee") },
        { key: "count", label: t("reports.count"), format: (value) => formatNumber(number(value)) },
      ]} />
      <CountTable title={t("reports.completedTasksByMonth")} rows={asRows(data.completed_tasks_per_month)} nameLabel={t("reports.month")} />
      <ListTable title={t("reports.overdueTasks")} rows={asRows(data.overdue_tasks)} columns={[
        { key: "title", label: t("reports.task") },
        { key: "project_name", label: t("reports.project") },
        { key: "assigned_to_name", label: t("reports.assignee") },
        { key: "priority", label: t("reports.priority"), format: (value) => <Badge variant="outline">{label(value, t)}</Badge> },
        { key: "due_date", label: t("reports.dueDate"), format: (value) => reportDate(value, formatDate) },
      ]} />
      <ListTable title={t("reports.tasksDueThisWeek")} rows={asRows(data.tasks_due_this_week)} columns={[
        { key: "title", label: t("reports.task") },
        { key: "project_name", label: t("reports.project") },
        { key: "assigned_to_name", label: t("reports.assignee") },
        { key: "due_date", label: t("reports.dueDate"), format: (value) => reportDate(value, formatDate) },
      ]} />
    </div>
  );
}

function StorageSection({ data }: { data: ReportData }) {
  const { formatNumber, t } = useReportRuntime();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title={t("reports.totalFiles")} value={formatNumber(number(data.total_files))} icon={FileText} />
        <MetricCard title={t("metric.storageUsed")} value={mb(data.storage_used_mb, formatNumber, t("reports.storageUnit"))} icon={Database} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ListTable title={t("reports.byCategory")} rows={asRows(data.files_by_category)} columns={[
          { key: "category", label: t("reports.category") },
          { key: "count", label: t("reports.count"), format: (value) => formatNumber(number(value)) },
          { key: "storage_mb", label: t("reports.storageSpace"), format: (value) => mb(value, formatNumber, t("reports.storageUnit")) },
        ]} />
        <ListTable title={t("reports.byProject")} rows={asRows(data.storage_by_project)} columns={[
          { key: "project_name", label: t("reports.project") },
          { key: "files_count", label: t("reports.filesCount"), format: (value) => formatNumber(number(value)) },
          { key: "storage_mb", label: t("reports.storageSpace"), format: (value) => mb(value, formatNumber, t("reports.storageUnit")) },
        ]} />
        <ListTable title={t("reports.byVisibility")} rows={asRows(data.storage_by_visibility)} columns={[
          { key: "visibility", label: t("reports.visibility"), format: (value) => label(value, t) },
          { key: "count", label: t("reports.count"), format: (value) => formatNumber(number(value)) },
          { key: "storage_mb", label: t("reports.storageSpace"), format: (value) => mb(value, formatNumber, t("reports.storageUnit")) },
        ]} />
        <ListTable title={t("reports.largestFiles")} rows={asRows(data.largest_files)} columns={[
          { key: "original_name", label: t("reports.file") },
          { key: "project_name", label: t("reports.project") },
          { key: "file_category", label: t("reports.category") },
          { key: "storage_mb", label: t("reports.storageSpace"), format: (value) => mb(value, formatNumber, t("reports.storageUnit")) },
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
  const { direction, formatCurrency, formatDate, formatNumber, t } = useTranslation();
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
        toast({ title: err instanceof Error ? err.message : t("reports.loadError"), variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [activeReport, filters]);

  const currentTitle = useMemo(() => {
    const tab = reportTabs.find((item) => item.key === activeReport);
    return tab ? t(tab.labelKey) : t("reports.title");
  }, [activeReport, t]);

  const applyFilters = () => {
    setFilters(draftFilters);
  };

  return (
    <AppLayout>
      <ReportRuntimeContext.Provider value={{ t, formatNumber, formatCurrency, formatDate }}>
      <div className="space-y-6" dir={direction}>
        <div>
          <h1 className="text-3xl font-bold">{t("reports.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("reports.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="from-date">{t("reports.fromDate")}</Label>
              <Input id="from-date" type="date" value={draftFilters.from_date ?? ""} onChange={(e) => setDraftFilters((prev) => ({ ...prev, from_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">{t("reports.toDate")}</Label>
              <Input id="to-date" type="date" value={draftFilters.to_date ?? ""} onChange={(e) => setDraftFilters((prev) => ({ ...prev, to_date: e.target.value }))} />
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>{t("reports.office")}</Label>
                <Select value={draftFilters.office_id ?? "all"} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, office_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("reports.allOffices")} />
                  </SelectTrigger>
                  <SelectContent dir={direction}>
                    <SelectItem value="all">{t("reports.allOffices")}</SelectItem>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={String(office.id)}>{office.officeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={applyFilters} className="gap-2">
              <CalendarDays className="w-4 h-4" />
              {t("reports.applyFilter")}
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
                  {t(tab.labelKey)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {reportTabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  {tab.key === "overview" ? t("reports.overview") : tab.key === "finance" ? t("reports.finance") : currentTitle}
                </h2>
                <Badge variant="outline">{t("reports.isolated")}</Badge>
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
      </ReportRuntimeContext.Provider>
    </AppLayout>
  );
}
