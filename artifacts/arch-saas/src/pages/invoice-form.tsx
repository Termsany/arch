import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { createInvoice } from "@/lib/invoices";

export default function InvoiceFormPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: project } = useGetProject(projectId);
  const [form, setForm] = useState({
    invoiceNumber: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    taxAmount: "0",
    discountAmount: "0",
    status: "draft",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const invoice = await createInvoice(projectId, {
        ...form,
        invoiceNumber: form.invoiceNumber || null,
        dueDate: form.dueDate || null,
        taxAmount: Number(form.taxAmount || 0),
        discountAmount: Number(form.discountAmount || 0),
        notes: form.notes || null,
      });
      toast({ title: "تم إنشاء الفاتورة" });
      setLocation(`/invoices/${invoice.id}`);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إنشاء الفاتورة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">فاتورة جديدة</h1>
          <p className="text-muted-foreground mt-1">{project?.projectName || "المشروع"}</p>
        </div>
        <Card>
          <CardHeader><CardTitle>بيانات الفاتورة</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم الفاتورة</Label>
                  <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="يتم توليده تلقائياً عند تركه فارغاً" />
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="sent">مرسلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الإصدار</Label>
                  <Input type="date" dir="ltr" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <Input type="date" dir="ltr" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الضريبة</Label>
                  <Input type="number" min="0" step="0.01" dir="ltr" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الخصم</Label>
                  <Input type="number" min="0" step="0.01" dir="ltr" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setLocation(`/projects/${projectId}`)}>إلغاء</Button>
                <Button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
