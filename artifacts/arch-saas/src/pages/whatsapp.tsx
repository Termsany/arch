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
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";

const WHATSAPP_STATUS_KEYS: Record<WhatsappMessageStatus, TranslationKey> = {
  pending: "whatsapp.status.pending",
  sent: "whatsapp.status.sent",
  failed: "whatsapp.status.failed",
  simulated: "whatsapp.status.simulated",
};

const WHATSAPP_TYPE_KEYS: Record<WhatsappMessageType, TranslationKey> = {
  client_approval_request: "whatsapp.type.client_approval_request",
  client_revision_update: "whatsapp.type.client_revision_update",
  file_uploaded: "whatsapp.type.file_uploaded",
  quotation_created: "whatsapp.type.quotation_created",
  invoice_created: "whatsapp.type.invoice_created",
  payment_reminder: "whatsapp.type.payment_reminder",
  appointment_reminder: "whatsapp.type.appointment_reminder",
  general: "whatsapp.type.general",
};

const emptyTemplate = { templateKey: "", nameAr: "", messageBody: "", isActive: true };
const emptyMessage = { phone: "", messageBody: "", messageType: "general" as WhatsappMessageType };

export default function WhatsAppSettingsPage() {
  const { t, direction, formatDate } = useTranslation();
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
      toast({ title: err instanceof Error ? err.message : t("whatsapp.loadError"), variant: "destructive" });
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
      toast({ title: editingTemplate ? t("whatsapp.templateUpdated") : t("whatsapp.templateCreated") });
      setTemplateOpen(false);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("whatsapp.templateSaveError"), variant: "destructive" });
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
      toast({ title: t("whatsapp.messageQueued") });
      setMessageForm(emptyMessage);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("whatsapp.messageSendError"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading && !status) {
    return <AppLayout><Skeleton className="h-96 w-full" /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div>
          <h1 className="text-3xl font-bold">{t("whatsapp.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("whatsapp.subtitle")}</p>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("whatsapp.integrationStatus")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{t("whatsapp.provider")}</p>
              <p className="font-semibold">{status?.provider || "simulation"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("common.status")}</p>
              <Badge variant={status?.enabled ? "default" : "secondary"}>{status?.enabled ? t("common.enabled") : t("common.disabled")}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("whatsapp.simulationMode")}</p>
              <Badge variant={status?.simulationMode ? "outline" : "default"}>{status?.simulationMode ? t("whatsapp.status.simulated") : t("whatsapp.liveMode")}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("whatsapp.templates")}</CardTitle>
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
              <DialogTrigger asChild><Button size="sm" onClick={() => openTemplate()} className="gap-2"><Plus className="w-4 h-4" />{t("whatsapp.newTemplate")}</Button></DialogTrigger>
              <DialogContent dir={direction} className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>{editingTemplate ? t("whatsapp.editTemplate") : t("whatsapp.newTemplate")}</DialogTitle></DialogHeader>
                <form onSubmit={saveTemplate} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("whatsapp.templateKey")}</Label>
                      <Input required value={templateForm.templateKey} onChange={(e) => setTemplateForm({ ...templateForm, templateKey: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("whatsapp.templateName")}</Label>
                      <Input required value={templateForm.nameAr} onChange={(e) => setTemplateForm({ ...templateForm, nameAr: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("whatsapp.messageBody")}</Label>
                    <Textarea required rows={6} value={templateForm.messageBody} onChange={(e) => setTemplateForm({ ...templateForm, messageBody: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={templateForm.isActive} onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isActive: checked })} />
                    <Label>{t("whatsapp.templateActive")}</Label>
                  </div>
                  <Button type="submit">{t("common.save")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? <div className="text-center py-10 text-muted-foreground">{t("whatsapp.emptyTemplates")}</div> : (
              <Table>
                <TableHeader><TableRow><TableHead className="text-start">{t("whatsapp.templateKey")}</TableHead><TableHead className="text-start">{t("common.name")}</TableHead><TableHead className="text-start">{t("common.status")}</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell dir="ltr" className="text-right">{template.templateKey}</TableCell>
                      <TableCell>{template.nameAr}</TableCell>
                      <TableCell><Badge variant={template.isActive ? "default" : "secondary"}>{template.isActive ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                      <TableCell className="text-left">
                        {template.officeId === null && !isSuperAdmin ? (
                          <Badge variant="outline">{t("whatsapp.globalTemplate")}</Badge>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openTemplate(template)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={async () => { await toggleWhatsappTemplate(template.id); load(); }}>
                              {template.isActive ? t("whatsapp.deactivate") : t("whatsapp.activate")}
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
          <CardHeader><CardTitle>{t("whatsapp.sendMessage")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitManualMessage} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input required placeholder={t("whatsapp.phone")} dir="ltr" value={messageForm.phone} onChange={(e) => setMessageForm({ ...messageForm, phone: e.target.value })} />
              <Select value={messageForm.messageType} onValueChange={(value) => setMessageForm({ ...messageForm, messageType: value as WhatsappMessageType })}>
                <SelectTrigger><SelectValue placeholder={t("whatsapp.messageType")} /></SelectTrigger>
                <SelectContent dir={direction}>
                  {WHATSAPP_MESSAGE_TYPES.map((type) => <SelectItem key={type} value={type}>{t(WHATSAPP_TYPE_KEYS[type])}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={sending} className="gap-2"><Send className="w-4 h-4" />{sending ? t("whatsapp.sending") : t("whatsapp.sendMessage")}</Button>
              <Textarea required className="md:col-span-3" rows={3} placeholder={t("whatsapp.messageBody")} value={messageForm.messageBody} onChange={(e) => setMessageForm({ ...messageForm, messageBody: e.target.value })} />
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>{t("whatsapp.messageLog")}</CardTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder={t("whatsapp.messageStatus")} /></SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="all">{t("whatsapp.allStatuses")}</SelectItem>
                  {(Object.keys(WHATSAPP_STATUS_KEYS) as WhatsappMessageStatus[]).map((value) => <SelectItem key={value} value={value}>{t(WHATSAPP_STATUS_KEYS[value])}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder={t("whatsapp.messageType")} /></SelectTrigger>
                <SelectContent dir={direction}>
                  <SelectItem value="all">{t("whatsapp.allTypes")}</SelectItem>
                  {WHATSAPP_MESSAGE_TYPES.map((type) => <SelectItem key={type} value={type}>{t(WHATSAPP_TYPE_KEYS[type])}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? <div className="text-center py-10 text-muted-foreground">{t("whatsapp.emptyMessages")}</div> : (
              <Table>
                <TableHeader><TableRow><TableHead className="text-start">{t("whatsapp.phone")}</TableHead><TableHead className="text-start">{t("whatsapp.messageType")}</TableHead><TableHead className="text-start">{t("whatsapp.messageStatus")}</TableHead><TableHead className="text-start">{t("common.createdAt")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell dir="ltr" className="text-right">{message.phone}</TableCell>
                      <TableCell>{WHATSAPP_TYPE_KEYS[message.messageType] ? t(WHATSAPP_TYPE_KEYS[message.messageType]) : message.messageType}</TableCell>
                      <TableCell><Badge variant={message.status === "failed" ? "destructive" : "outline"}>{t(WHATSAPP_STATUS_KEYS[message.status as WhatsappMessageStatus])}</Badge></TableCell>
                      <TableCell dir="ltr" className="text-right">{formatDate(message.createdAt)}</TableCell>
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
