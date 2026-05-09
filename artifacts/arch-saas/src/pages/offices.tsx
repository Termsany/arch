import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetOffices, 
  useCreateOffice, 
  useUpdateOffice, 
  useDeleteOffice,
  useGetActivePlans,
  getGetOfficesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Search, Building2, Copy, Settings2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";
import { OFFICE_CONTROLLED_MODULES, APP_MODULES, type AppModuleKey } from "@/lib/modules";
import { fetchOfficeModules, updateOfficeModules } from "@/lib/module-access";

const SUBSCRIPTION_STATUSES = [
  { value: "trial", labelKey: "status.trial", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "active", labelKey: "status.active", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  { value: "past_due", labelKey: "status.past_due", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { value: "inactive", labelKey: "status.inactive", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300" },
  { value: "cancelled", labelKey: "status.cancelled", color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300" }
] satisfies Array<{ value: string; labelKey: TranslationKey; color: string }>;

type CreateOfficeInviteResponse = {
  office?: unknown;
  officeAdmin?: unknown;
  inviteUrl?: string;
  inviteExpiresAt?: string;
};

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
}

function getErrorMessage(error: unknown): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === "object") {
    const message = (data as { message?: unknown; error?: unknown }).message ?? (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.trim()) return message;

  return "";
}

export default function Offices() {
  const queryClient = useQueryClient();
  const { direction, t, formatDate } = useTranslation();
  const { data: offices, isLoading } = useGetOffices();
  const { data: plans } = useGetActivePlans();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [modulesOffice, setModulesOffice] = useState<{ id: number; officeName: string } | null>(null);
  const [moduleSelection, setModuleSelection] = useState<AppModuleKey[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesSaving, setModulesSaving] = useState(false);
  const [latestInvite, setLatestInvite] = useState<CreateOfficeInviteResponse | null>(null);
  const [editingOffice, setEditingOffice] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    officeName: "",
    ownerName: "",
    phone: "",
    email: "",
    address: "",
    planId: "none",
    subscriptionStatus: "trial",
    subscriptionStart: dateOnly(new Date()),
    subscriptionEnd: ""
  });

  const createMutation = useCreateOffice({
    mutation: {
      onSuccess: (data) => {
        const response = data as CreateOfficeInviteResponse;
        queryClient.invalidateQueries({ queryKey: getGetOfficesQueryKey() });
        toast({ title: t("toast.inviteCreated") });
        setIsDialogOpen(false);
        resetForm();
        setLatestInvite(response);
        if (response.inviteUrl) {
          setIsInviteDialogOpen(true);
        }
      },
      onError: (error) => toast({ title: getErrorMessage(error) || t("error.tryAgain"), variant: "destructive" })
    }
  });

  const updateMutation = useUpdateOffice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOfficesQueryKey() });
        toast({ title: t("toast.saved") });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: (error) => toast({ title: getErrorMessage(error) || t("error.tryAgain"), variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteOffice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOfficesQueryKey() });
        toast({ title: t("toast.deleted") });
      },
      onError: (error) => toast({ title: getErrorMessage(error) || t("error.tryAgain"), variant: "destructive" })
    }
  });

  const resetForm = () => {
    setFormData({
      officeName: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      planId: "none",
      subscriptionStatus: "trial",
      subscriptionStart: dateOnly(new Date()),
      subscriptionEnd: ""
    });
    setEditingOffice(null);
  };

  const copyInviteLink = async () => {
    if (!latestInvite?.inviteUrl) return;
    await navigator.clipboard.writeText(latestInvite.inviteUrl);
    toast({ title: t("toast.inviteCopied") });
  };

  const openModulesDialog = async (office: { id: number; officeName: string }) => {
    setModulesOffice(office);
    setModulesDialogOpen(true);
    setModulesLoading(true);
    try {
      const data = await fetchOfficeModules(office.id);
      setModuleSelection(data.enabledModules);
    } catch {
      toast({ title: t("modules.loadError"), variant: "destructive" });
      setModuleSelection(["dashboard"]);
    } finally {
      setModulesLoading(false);
    }
  };

  const toggleModule = (moduleKey: AppModuleKey, checked: boolean) => {
    setModuleSelection((current) => {
      if (checked) return current.includes(moduleKey) ? current : [...current, moduleKey];
      return current.filter((item) => item !== moduleKey);
    });
  };

  const saveModules = async () => {
    if (!modulesOffice) return;
    setModulesSaving(true);
    try {
      const data = await updateOfficeModules(modulesOffice.id, moduleSelection);
      setModuleSelection(data.enabledModules);
      window.dispatchEvent(new CustomEvent("modules:updated"));
      toast({ title: t("modules.saved") });
      setModulesDialogOpen(false);
    } catch {
      toast({ title: t("modules.updateError"), variant: "destructive" });
    } finally {
      setModulesSaving(false);
    }
  };

  const handleEdit = (office: any) => {
    setEditingOffice(office);
    setFormData({
      officeName: office.officeName,
      ownerName: office.ownerName || "",
      phone: office.phone || "",
      email: office.email || "",
      address: office.address || "",
      planId: office.planId ? office.planId.toString() : "none",
      subscriptionStatus: office.subscriptionStatus,
      subscriptionStart: office.subscriptionStart ? office.subscriptionStart.substring(0, 10) : dateOnly(new Date()),
      subscriptionEnd: office.subscriptionEnd ? office.subscriptionEnd.substring(0, 10) : ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subscriptionStart = formData.subscriptionStart || dateOnly(new Date());
    const subscriptionEnd = formData.subscriptionEnd || (formData.subscriptionStatus === "trial" ? addDays(subscriptionStart, 14) : null);
    const payload = {
      officeName: formData.officeName,
      ownerName: formData.ownerName || null,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      planId: formData.planId === "none" ? null : parseInt(formData.planId),
      subscriptionStatus: formData.subscriptionStatus,
      subscriptionStart,
      ...(subscriptionEnd ? { subscriptionEnd } : {})
    };

    if (editingOffice) {
      updateMutation.mutate({ id: editingOffice.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const filteredOffices = offices?.filter(o => 
    o.officeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.ownerName && o.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const s = SUBSCRIPTION_STATUSES.find(x => x.value === status);
    if (!s) return null;
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{t(s.labelKey)}</span>;
  };

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("offices.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("offices.subtitle")}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t("offices.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" dir={direction}>
              <DialogHeader>
                <DialogTitle>{editingOffice ? t("offices.edit") : t("offices.create")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="officeName">{t("offices.officeName")} *</Label>
                    <Input required value={formData.officeName} onChange={e => setFormData({...formData, officeName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">{t("offices.ownerName")} *</Label>
                    <Input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("offices.phone")}</Label>
                    <Input dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("offices.email")} *</Label>
                    <Input required type="email" dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                {!editingOffice && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
                    {t("offices.inviteNotice")}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("offices.subscriptionDetails")}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label className="text-xs">{t("offices.plan")}</Label>
                      <Select value={formData.planId} onValueChange={v => setFormData({...formData, planId: v})}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t("offices.noPlan")} /></SelectTrigger>
                        <SelectContent dir={direction}>
                          <SelectItem value="none">{t("offices.noPlan")}</SelectItem>
                          {plans?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nameAr}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("offices.subscriptionStatus")}</Label>
                      <Select value={formData.subscriptionStatus} onValueChange={v => setFormData({...formData, subscriptionStatus: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent dir={direction}>
                          {SUBSCRIPTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{t(s.labelKey)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("offices.startDate")}</Label>
                      <Input type="date" dir="ltr" className="h-9 text-sm" value={formData.subscriptionStart} onChange={e => setFormData({...formData, subscriptionStart: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("offices.endDate")}</Label>
                      <Input type="date" dir="ltr" className="h-9 text-sm" value={formData.subscriptionEnd} onChange={e => setFormData({...formData, subscriptionEnd: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {t("offices.save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" dir={direction}>
            <DialogHeader>
              <DialogTitle>{t("offices.inviteTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("offices.inviteHelp")}
              </p>
              <div className="flex gap-2">
                <Input dir="ltr" readOnly value={latestInvite?.inviteUrl || ""} className="text-xs" />
                <Button type="button" onClick={copyInviteLink} className="gap-2">
                  <Copy className="w-4 h-4" />
                  {t("common.copy")}
                </Button>
              </div>
              {latestInvite?.inviteExpiresAt && (
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {t("common.expires")}: {formatDate(latestInvite.inviteExpiresAt)}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={modulesDialogOpen} onOpenChange={setModulesDialogOpen}>
          <DialogContent className="sm:max-w-[560px]" dir={direction}>
            <DialogHeader>
              <DialogTitle>{t("modules.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {modulesOffice?.officeName ? `${t("modules.description")} - ${modulesOffice.officeName}` : t("modules.description")}
              </p>
              {modulesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="grid gap-2">
                  {OFFICE_CONTROLLED_MODULES.map((moduleKey) => {
                    const module = APP_MODULES.find((item) => item.key === moduleKey);
                    if (!module) return null;
                    return (
                      <div key={module.key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <Label className="cursor-pointer" htmlFor={`module-${module.key}`}>{t(module.labelKey)}</Label>
                        <Switch
                          id={`module-${module.key}`}
                          checked={moduleSelection.includes(module.key)}
                          onCheckedChange={(checked) => toggleModule(module.key, checked)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={saveModules} disabled={modulesLoading || modulesSaving}>
                  {modulesSaving ? t("common.saving") : t("modules.save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t("offices.search")}
                className="pl-3 pr-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t("offices.officeName")}</TableHead>
                  <TableHead className="text-right">{t("offices.owner")}</TableHead>
                  <TableHead className="text-right">{t("offices.contact")}</TableHead>
                  <TableHead className="text-right">{t("offices.subscriptionPlan")}</TableHead>
                  <TableHead className="text-right">{t("offices.subscriptionStatus")}</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-[80px]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOffices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {t("offices.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOffices?.map((office) => (
                    <TableRow key={office.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {office.officeName}
                      </TableCell>
                      <TableCell>{office.ownerName || "-"}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {office.phone && <div dir="ltr" className="text-right">{office.phone}</div>}
                          {office.email && <div className="text-muted-foreground">{office.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {office.planName ? (
                          <span className="font-medium text-primary">{office.planName}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t("offices.noPlan")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(office.subscriptionStatus)}
                          {office.subscriptionEnd && (
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {formatDate(office.subscriptionEnd)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openModulesDialog({ id: office.id, officeName: office.officeName })} title={t("modules.manage")}>
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(office)} title={t("common.edit")}>
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title={t("common.delete")}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir={direction}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("offices.deleteWarning")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ id: office.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
