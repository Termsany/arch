import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fetchInvoices, STATUS_LABELS, type Invoice } from "@/lib/invoices";
import { useTranslation } from "@/i18n/language-context";

export default function InvoicesPage() {
  const { direction, formatCurrency, formatDate } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch((err) => toast({ title: err instanceof Error ? err.message : "تعذر تحميل الفواتير", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div>
          <h1 className="text-3xl font-bold">الفواتير والمدفوعات</h1>
          <p className="text-muted-foreground mt-1">متابعة الفواتير والمدفوعات اليدوية لكل مكتب</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : invoices.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">لا توجد فواتير</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">المشروع</TableHead>
                    <TableHead className="text-right">إجمالي الفاتورة</TableHead>
                    <TableHead className="text-right">المدفوع</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
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
                      <TableCell><Badge variant="outline">{STATUS_LABELS[invoice.status]}</Badge></TableCell>
                      <TableCell><Button asChild variant="outline" size="sm"><Link href={`/invoices/${invoice.id}`}>عرض</Link></Button></TableCell>
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
