import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { fetchAuditLogs, type AuditLogFilters, type AuditLogItem } from "@/lib/audit-logs";
import { Eye, Filter, ScrollText } from "lucide-react";

const labels = {
  ar: {
    title: "سجل النشاط",
    action: "الإجراء",
    entityType: "نوع العنصر",
    user: "المستخدم",
    office: "المكتب",
    date: "التاريخ",
    details: "التفاصيل",
    oldValue: "القيمة القديمة",
    newValue: "القيمة الجديدة",
    ipAddress: "عنوان IP",
    userAgent: "المتصفح",
    noLogs: "لا توجد سجلات",
    filter: "تطبيق الفلتر",
    reset: "مسح",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    entityId: "معرف العنصر",
    userId: "معرف المستخدم",
    officeId: "معرف المكتب",
    loadingError: "تعذر تحميل سجل النشاط",
    next: "التالي",
    previous: "السابق",
  },
  en: {
    title: "Audit Logs",
    action: "Action",
    entityType: "Entity Type",
    user: "User",
    office: "Office",
    date: "Date",
    details: "Details",
    oldValue: "Old Value",
    newValue: "New Value",
    ipAddress: "IP Address",
    userAgent: "User Agent",
    noLogs: "No logs available",
    filter: "Apply Filter",
    reset: "Reset",
    fromDate: "From Date",
    toDate: "To Date",
    entityId: "Entity ID",
    userId: "User ID",
    officeId: "Office ID",
    loadingError: "Could not load audit logs",
    next: "Next",
    previous: "Previous",
  },
};

function pretty(value: unknown) {
  if (value === null || value === undefined) return "-";
  return JSON.stringify(value, null, 2);
}

export default function AuditLogsPage() {
  const language = (localStorage.getItem("language") === "en" ? "en" : "ar") as "ar" | "en";
  const t = labels[language];
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, limit: 25 });
  const [draft, setDraft] = useState<AuditLogFilters>({ page: 1, limit: 25 });
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Number(filters.limit ?? 25))), [filters.limit, total]);

  useEffect(() => {
    setIsLoading(true);
    fetchAuditLogs(filters)
      .then((data) => {
        setLogs(data.items);
        setTotal(data.total);
      })
      .catch((err) => toast({ title: err instanceof Error ? err.message : t.loadingError, variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [filters, t.loadingError]);

  const applyFilters = () => setFilters({ ...draft, page: 1, limit: 25 });
  const resetFilters = () => {
    setDraft({ page: 1, limit: 25 });
    setFilters({ page: 1, limit: 25 });
  };

  return (
    <AppLayout>
      <div className="space-y-5" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{total.toLocaleString(language === "ar" ? "ar-EG" : "en-US")} {t.title}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t.filter}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>{t.action}</Label>
                <Input value={draft.action ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, action: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t.entityType}</Label>
                <Input value={draft.entityType ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, entityType: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t.entityId}</Label>
                <Input type="number" value={draft.entityId ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, entityId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t.userId}</Label>
                <Input type="number" value={draft.userId ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, userId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t.officeId}</Label>
                <Input type="number" value={draft.officeId ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, officeId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t.fromDate}</Label>
                <Input type="date" value={draft.fromDate ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, fromDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t.toDate}</Label>
                <Input type="date" value={draft.toDate ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, toDate: e.target.value }))} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={applyFilters}>{t.filter}</Button>
                <Button variant="outline" onClick={resetFilters}>{t.reset}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">{t.noLogs}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.action}</TableHead>
                    <TableHead>{t.entityType}</TableHead>
                    <TableHead>{t.user}</TableHead>
                    <TableHead>{t.office}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.details}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell>{log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</TableCell>
                      <TableCell>{log.userName || log.userEmail || "-"}</TableCell>
                      <TableCell>{log.officeName || "-"}</TableCell>
                      <TableCell dir="ltr">{new Date(log.createdAt).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelected(log)}>
                          <Eye className="w-4 h-4" />
                          {t.details}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}>
            {t.previous}
          </Button>
          <span className="text-sm text-muted-foreground" dir="ltr">{filters.page ?? 1} / {totalPages}</span>
          <Button variant="outline" disabled={(filters.page ?? 1) >= totalPages} onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}>
            {t.next}
          </Button>
        </div>

        <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto" dir={language === "ar" ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t.details}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div><strong>{t.ipAddress}:</strong> <span dir="ltr">{selected.ipAddress || "-"}</span></div>
                  <div><strong>{t.userAgent}:</strong> <span dir="ltr">{selected.userAgent || "-"}</span></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">{t.oldValue}</h3>
                    <pre className="text-xs bg-muted rounded-md p-3 overflow-auto text-left" dir="ltr">{pretty(selected.oldValue)}</pre>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t.newValue}</h3>
                    <pre className="text-xs bg-muted rounded-md p-3 overflow-auto text-left" dir="ltr">{pretty(selected.newValue)}</pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
