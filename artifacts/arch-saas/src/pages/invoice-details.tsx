import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageCircle, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  addInvoiceItem,
  addPayment,
  createInvoiceDocument,
  deleteInvoice,
  deleteInvoiceItem,
  deletePayment,
  fetchInvoice,
  STATUS_LABELS,
  updateInvoice,
  updateInvoiceStatus,
  type InvoiceDetails,
} from "@/lib/invoices";
import { sendWhatsappMessage, type WhatsappMessageType } from "@/lib/whatsapp";
import { useTranslation } from "@/i18n/language-context";

const emptyItem = { itemName: "", description: "", quantity: "1", unitPrice: "0" };
const emptyPayment = { amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "", referenceNumber: "", notes: "" };

export default function InvoiceDetailsPage() {
  const { direction, formatCurrency, formatDate } = useTranslation();
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params.id);
  const [, setLocation] = useLocation();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemOpen, setItemOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [editForm, setEditForm] = useState({ dueDate: "", taxAmount: "0", discountAmount: "0", notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoice(invoiceId);
      setInvoice(data);
      setEditForm({
        dueDate: data.dueDate || "",
        taxAmount: String(data.taxAmount || "0"),
        discountAmount: String(data.discountAmount || "0"),
        notes: data.notes || "",
      });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تحميل الفاتورة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (invoiceId) load(); }, [invoiceId]);

  const saveMeta = async () => {
    try {
      await updateInvoice(invoiceId, {
        dueDate: editForm.dueDate || null,
        taxAmount: Number(editForm.taxAmount || 0),
        discountAmount: Number(editForm.discountAmount || 0),
        notes: editForm.notes || null,
      });
      toast({ title: "تم تحديث الفاتورة" });
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تحديث الفاتورة", variant: "destructive" });
    }
  };

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await addInvoiceItem(invoiceId, { ...itemForm, quantity: Number(itemForm.quantity), unitPrice: Number(itemForm.unitPrice), description: itemForm.description || null });
      setItemOpen(false);
      setItemForm(emptyItem);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إضافة البند", variant: "destructive" });
    }
  };

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await addPayment(invoiceId, {
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate || null,
        paymentMethod: paymentForm.paymentMethod || null,
        referenceNumber: paymentForm.referenceNumber || null,
        notes: paymentForm.notes || null,
      });
      setPaymentOpen(false);
      setPaymentForm(emptyPayment);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تسجيل الدفعة", variant: "destructive" });
    }
  };

  const printInvoice = async () => {
    try {
      const doc = await createInvoiceDocument(invoiceId);
      setLocation(`/documents/${doc.id}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إنشاء مستند الفاتورة", variant: "destructive" });
    }
  };

  const sendInvoiceWhatsapp = async (messageType: WhatsappMessageType, messageBody: string) => {
    if (!invoice?.clientPhone) {
      toast({ title: "لا يوجد رقم هاتف لهذا العميل", variant: "destructive" });
      return;
    }
    try {
      await sendWhatsappMessage({
        phone: invoice.clientPhone,
        messageBody,
        messageType,
        invoiceId: invoice.id,
        projectId: invoice.projectId,
        clientId: invoice.clientId,
      });
      toast({ title: "تم تسجيل رسالة واتساب" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إرسال رسالة واتساب", variant: "destructive" });
    }
  };

  if (loading) return <AppLayout><Skeleton className="h-96 w-full" /></AppLayout>;
  if (!invoice) return <AppLayout><div className="text-center py-16 text-muted-foreground">الفاتورة غير موجودة</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">رقم الفاتورة {invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground mt-1">{invoice.clientName} - {invoice.projectName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={printInvoice} className="gap-2"><Printer className="w-4 h-4" />طباعة</Button>
            <Button
              variant="outline"
              onClick={() => sendInvoiceWhatsapp("invoice_created", `مرحباً ${invoice.clientName || "عميلنا"}، تم إصدار فاتورة رقم ${invoice.invoiceNumber} لمشروع "${invoice.projectName || "-"}" بإجمالي ${formatCurrency(invoice.totalAmount)}.`)}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />إرسال الفاتورة واتساب
            </Button>
            <Button
              variant="outline"
              onClick={() => sendInvoiceWhatsapp("payment_reminder", `مرحباً ${invoice.clientName || "عميلنا"}، نذكركم بوجود مبلغ مستحق بقيمة ${formatCurrency(invoice.remainingAmount)} على الفاتورة ${invoice.invoiceNumber}.`)}
            >
              إرسال تذكير بالدفع
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive">حذف</Button></AlertDialogTrigger>
              <AlertDialogContent dir={direction}>
                <AlertDialogHeader><AlertDialogTitle>حذف الفاتورة؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف البنود والمدفوعات المرتبطة بها.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { await deleteInvoice(invoice.id); setLocation("/invoices"); }}>حذف</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ["إجمالي الفاتورة", invoice.totalAmount],
            ["المدفوع", invoice.paidAmount],
            ["المتبقي", invoice.remainingAmount],
            ["الضريبة", invoice.taxAmount],
          ].map(([label, value]) => (
            <Card key={label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold" dir="ltr">{formatCurrency(value)}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>معلومات الفاتورة</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>تاريخ الإصدار</Label><Input value={formatDate(invoice.issueDate)} disabled dir="ltr" /></div>
            <div className="space-y-2"><Label>تاريخ الاستحقاق</Label><Input type="date" dir="ltr" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={invoice.status} onValueChange={async (status) => { await updateInvoiceStatus(invoiceId, status as "draft" | "sent" | "cancelled"); load(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">مرسلة</SelectItem>
                  <SelectItem value="cancelled">ملغية</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">{STATUS_LABELS[invoice.status]}</Badge>
            </div>
            <div className="space-y-2"><Label>الضريبة</Label><Input type="number" min="0" step="0.01" dir="ltr" value={editForm.taxAmount} onChange={(e) => setEditForm({ ...editForm, taxAmount: e.target.value })} /></div>
            <div className="space-y-2"><Label>الخصم</Label><Input type="number" min="0" step="0.01" dir="ltr" value={editForm.discountAmount} onChange={(e) => setEditForm({ ...editForm, discountAmount: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-3"><Label>ملاحظات</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <div className="md:col-span-3 flex justify-end"><Button onClick={saveMeta}>حفظ التعديلات</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>بنود الفاتورة</CardTitle>
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />إضافة بند</Button></DialogTrigger>
              <DialogContent dir={direction}>
                <DialogHeader><DialogTitle>إضافة بند</DialogTitle></DialogHeader>
                <form onSubmit={addItem} className="space-y-3">
                  <Input required placeholder="البند" value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} />
                  <Textarea placeholder="الوصف" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input required type="number" min="0.01" step="0.01" dir="ltr" placeholder="الكمية" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                    <Input required type="number" min="0" step="0.01" dir="ltr" placeholder="سعر الوحدة" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} />
                  </div>
                  <Button type="submit">حفظ</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {invoice.items.length === 0 ? <div className="text-center py-10 text-muted-foreground">لا توجد بنود</div> : (
              <Table><TableHeader><TableRow><TableHead className="text-right">البند</TableHead><TableHead className="text-right">الوصف</TableHead><TableHead className="text-right">الكمية</TableHead><TableHead className="text-right">سعر الوحدة</TableHead><TableHead className="text-right">الإجمالي</TableHead><TableHead /></TableRow></TableHeader><TableBody>
                {invoice.items.map((item) => <TableRow key={item.id}><TableCell>{item.itemName}</TableCell><TableCell>{item.description || "-"}</TableCell><TableCell dir="ltr">{item.quantity}</TableCell><TableCell dir="ltr">{formatCurrency(item.unitPrice)}</TableCell><TableCell dir="ltr">{formatCurrency(item.totalPrice)}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={async () => { await deleteInvoiceItem(item.id); load(); }}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell></TableRow>)}
              </TableBody></Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>المدفوعات</CardTitle>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild><Button size="sm">تسجيل دفعة</Button></DialogTrigger>
              <DialogContent dir={direction}>
                <DialogHeader><DialogTitle>تسجيل دفعة</DialogTitle></DialogHeader>
                <form onSubmit={recordPayment} className="space-y-3">
                  <Input required type="number" min="0.01" step="0.01" dir="ltr" placeholder="مبلغ الدفعة" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                  <Input type="date" dir="ltr" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                  <Input placeholder="طريقة الدفع" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} />
                  <Input placeholder="رقم المرجع" value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} />
                  <Textarea placeholder="ملاحظات" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                  <Button type="submit">حفظ</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? <div className="text-center py-10 text-muted-foreground">لا توجد مدفوعات</div> : (
              <Table><TableHeader><TableRow><TableHead className="text-right">تاريخ الدفعة</TableHead><TableHead className="text-right">مبلغ الدفعة</TableHead><TableHead className="text-right">طريقة الدفع</TableHead><TableHead className="text-right">رقم المرجع</TableHead><TableHead /></TableRow></TableHeader><TableBody>
                {invoice.payments.map((payment) => <TableRow key={payment.id}><TableCell dir="ltr">{formatDate(payment.paymentDate)}</TableCell><TableCell dir="ltr">{formatCurrency(payment.amount)}</TableCell><TableCell>{payment.paymentMethod || "-"}</TableCell><TableCell>{payment.referenceNumber || "-"}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={async () => { await deletePayment(payment.id); load(); }}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell></TableRow>)}
              </TableBody></Table>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" asChild><Link href="/invoices">العودة للفواتير</Link></Button>
      </div>
    </AppLayout>
  );
}
