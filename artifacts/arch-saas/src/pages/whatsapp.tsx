import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createWhatsappTemplate,
  deleteWhatsappTemplate,
  fetchWhatsappMessages,
  fetchWhatsappStatus,
  fetchWhatsappTemplates,
  MESSAGE_STATUS_LABELS,
  MESSAGE_TYPE_LABELS,
  sendWhatsappMessage,
  toggleWhatsappTemplate,
  updateWhatsappTemplate,
  WHATSAPP_MESSAGE_TYPES,
  type WhatsappMessage,
  type WhatsappMessageStatus,
  type WhatsappMessageType,
  type WhatsappStatus,
  type WhatsappTemplate,
} from "@/lib/whatsapp";

const emptyTemplate = { templateKey: "", nameAr: "", messageBody: "", isActive: true };
const emptyMessage = { phone: "", messageBody: "", messageType: "general" as WhatsappMessageType };

export default function WhatsAppSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = (user as { role?: string } | null)?.role === "super_admin";
  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [messageForm, setMessageForm] = useState(emptyMessage);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [statusData, templateData, messageData] = await Promise.all([
        fetchWhatsappStatus(),
        fetchWhatsappTemplates(),
        fetchWhatsappMessages({ status: statusFilter, messageType: typeFilter }),
      ]);
      setStatus(statusData);
      setTemplates(templateData);
      setMessages(messageData);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تحميل إعدادات واتساب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const openTemplate = (template?: WhatsappTemplate) => {
    setEditingTemplate(template ?? null);
    setTemplateForm(template ? {
      templateKey: template.templateKey,
      nameAr: template.nameAr,
      messageBody: template.messageBody,
      isActive: template.isActive,
    } : emptyTemplate);
    setTemplateOpen(true);
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingTemplate) {
        await updateWhatsappTemplate(editingTemplate.id, templateForm);
      } else {
        await createWhatsappTemplate(templateForm);
      }
      toast({ title: editingTemplate ? "تم تعديل القالب" : "تم إنشاء القالب" });
      setTemplateOpen(false);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حفظ القالب", variant: "destructive" });
    }
  };

  const submitManualMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await sendWhatsappMessage({
        phone: messageForm.phone,
        messageBody: messageForm.messageBody,
        messageType: messageForm.messageType,
      });
      toast({ title: "تم تسجيل رسالة واتساب" });
      setMessageForm(emptyMessage);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إرسال الرسالة", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading && !status) {
    return <AppLayout><Skeleton className="h-96 w-full" /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">إعدادات واتساب</h1>
          <p className="text-muted-foreground mt-1">قوالب الرسائل، سجل الإرسال، ووضع التجربة المحلي.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>حالة التكامل</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">مزود الخدمة</p>
              <p className="font-semibold">{status?.provider || "simulation"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الحالة</p>
              <Badge variant={status?.enabled ? "default" : "secondary"}>{status?.enabled ? "مفعل" : "معطل"}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">وضع التجربة</p>
              <Badge variant={status?.simulationMode ? "outline" : "default"}>{status?.simulationMode ? "تجريبية" : "إرسال فعلي"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>قوالب الرسائل</CardTitle>
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
              <DialogTrigger asChild><Button size="sm" onClick={() => openTemplate()} className="gap-2"><Plus className="w-4 h-4" />قالب جديد</Button></DialogTrigger>
              <DialogContent dir="rtl" className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>{editingTemplate ? "تعديل القالب" : "قالب جديد"}</DialogTitle></DialogHeader>
                <form onSubmit={saveTemplate} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>مفتاح القالب</Label>
                      <Input required value={templateForm.templateKey} onChange={(e) => setTemplateForm({ ...templateForm, templateKey: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم القالب</Label>
                      <Input required value={templateForm.nameAr} onChange={(e) => setTemplateForm({ ...templateForm, nameAr: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>نص الرسالة</Label>
                    <Textarea required rows={6} value={templateForm.messageBody} onChange={(e) => setTemplateForm({ ...templateForm, messageBody: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={templateForm.isActive} onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isActive: checked })} />
                    <Label>القالب فعال</Label>
                  </div>
                  <Button type="submit">حفظ</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? <div className="text-center py-10 text-muted-foreground">لا توجد قوالب رسائل</div> : (
              <Table>
                <TableHeader><TableRow><TableHead className="text-right">مفتاح القالب</TableHead><TableHead className="text-right">الاسم</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell dir="ltr" className="text-right">{template.templateKey}</TableCell>
                      <TableCell>{template.nameAr}</TableCell>
                      <TableCell><Badge variant={template.isActive ? "default" : "secondary"}>{template.isActive ? "فعالة" : "معطلة"}</Badge></TableCell>
                      <TableCell className="text-left">
                        {template.officeId === null && !isSuperAdmin ? (
                          <Badge variant="outline">قالب عام</Badge>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openTemplate(template)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={async () => { await toggleWhatsappTemplate(template.id); load(); }}>
                              {template.isActive ? "تعطيل" : "تفعيل"}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={async () => { await deleteWhatsappTemplate(template.id); load(); }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>إرسال رسالة</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitManualMessage} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input required placeholder="رقم الهاتف" dir="ltr" value={messageForm.phone} onChange={(e) => setMessageForm({ ...messageForm, phone: e.target.value })} />
              <Select value={messageForm.messageType} onValueChange={(value) => setMessageForm({ ...messageForm, messageType: value as WhatsappMessageType })}>
                <SelectTrigger><SelectValue placeholder="نوع الرسالة" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {WHATSAPP_MESSAGE_TYPES.map((type) => <SelectItem key={type} value={type}>{MESSAGE_TYPE_LABELS[type]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={sending} className="gap-2"><Send className="w-4 h-4" />{sending ? "جاري الإرسال..." : "إرسال رسالة"}</Button>
              <Textarea required className="md:col-span-3" rows={3} placeholder="نص الرسالة" value={messageForm.messageBody} onChange={(e) => setMessageForm({ ...messageForm, messageBody: e.target.value })} />
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>سجل الرسائل</CardTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="حالة الرسالة" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {Object.entries(MESSAGE_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="نوع الرسالة" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {WHATSAPP_MESSAGE_TYPES.map((type) => <SelectItem key={type} value={type}>{MESSAGE_TYPE_LABELS[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? <div className="text-center py-10 text-muted-foreground">لا توجد رسائل واتساب</div> : (
              <Table>
                <TableHeader><TableRow><TableHead className="text-right">رقم الهاتف</TableHead><TableHead className="text-right">نوع الرسالة</TableHead><TableHead className="text-right">حالة الرسالة</TableHead><TableHead className="text-right">تاريخ الإنشاء</TableHead></TableRow></TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell dir="ltr" className="text-right">{message.phone}</TableCell>
                      <TableCell>{MESSAGE_TYPE_LABELS[message.messageType] || message.messageType}</TableCell>
                      <TableCell><Badge variant={message.status === "failed" ? "destructive" : "outline"}>{MESSAGE_STATUS_LABELS[message.status as WhatsappMessageStatus]}</Badge></TableCell>
                      <TableCell dir="ltr" className="text-right">{new Date(message.createdAt).toLocaleString("ar-EG")}</TableCell>
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
