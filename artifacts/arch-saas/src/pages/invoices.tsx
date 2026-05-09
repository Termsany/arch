import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fetchInvoices, type Invoice, type InvoiceStatus } from "@/lib/invoices";
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";

const INVOICE_STATUS_KEYS: Record<InvoiceStatus, TranslationKey> = {
  draft: "invoice.status.draft",
  sent: "invoice.status.sent",
  partially_paid: "invoice.status.partially_paid",
  paid: "invoice.status.paid",
  overdue: "invoice.status.overdue",
  cancelled: "invoice.status.cancelled",
};

export default function InvoicesPage() {
  const { direction, formatCurrency, formatDate, t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch((err) => toast({ title: err instanceof Error ? err.message : t("invoices.loadError"), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div>
          <h1 className="text-3xl font-bold">{t("invoices.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("invoices.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : invoices.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">{t("invoices.empty")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t("invoices.number")}</TableHead>
                    <TableHead className="text-right">{t("invoices.client")}</TableHead>
                    <TableHead className="text-right">{t("invoices.project")}</TableHead>
                    <TableHead className="text-right">{t("invoices.total")}</TableHead>
                    <TableHead className="text-right">{t("invoices.paid")}</TableHead>
                    <TableHead className="text-right">{t("invoices.remaining")}</TableHead>
                    <TableHead className="text-right">{t("invoices.dueDate")}</TableHead>
                    <TableHead className="text-right">{t("invoices.status")}</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName || "-"}</TableCell>
                      <TableCell>{invoice.projectName || "-"}</TableCell>
                      <TableCell dir="ltr">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell dir="ltr">{formatCurrency(invoice.paidAmount)}</TableCell>
                      <TableCell dir="ltr">{formatCurrency(invoice.remainingAmount)}</TableCell>
                      <TableCell dir="ltr">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell><Badge variant="outline">{t(INVOICE_STATUS_KEYS[invoice.status])}</Badge></TableCell>
                      <TableCell><Button asChild variant="outline" size="sm"><Link href={`/invoices/${invoice.id}`}>{t("invoices.view")}</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
