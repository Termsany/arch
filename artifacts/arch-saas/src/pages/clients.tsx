import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetClients, 
  useCreateClient, 
  useUpdateClient, 
  useDeleteClient,
  getGetClientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Search, KeyRound, CheckCircle2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { parseApiResponse } from "@/lib/api-response";
import { useTranslation } from "@/i18n/language-context";

interface PortalUserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function Clients() {
  const { direction, t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useGetClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: ""
  });

  const [portalDialog, setPortalDialog] = useState<{ open: boolean; clientId: number | null; clientName: string; existingUser: PortalUserInfo | null; isLoading: boolean }>({
    open: false, clientId: null, clientName: "", existingUser: null, isLoading: false,
  });
  const [portalForm, setPortalForm] = useState({ email: "", password: "" });
  const [isPortalSubmitting, setIsPortalSubmitting] = useState(false);

  const createMutation = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientsQueryKey() });
        toast({ title: t("toast.saved") });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: () => toast({ title: t("error.tryAgain"), variant: "destructive" })
    }
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientsQueryKey() });
        toast({ title: t("toast.saved") });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: () => toast({ title: t("error.tryAgain"), variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientsQueryKey() });
        toast({ title: t("toast.deleted") });
      },
      onError: () => toast({ title: t("error.tryAgain"), variant: "destructive" })
    }
  });

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
    setEditingClient(null);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      notes: client.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  const openPortalDialog = async (client: any) => {
    setPortalDialog({ open: true, clientId: client.id, clientName: client.name, existingUser: null, isLoading: true });
    setPortalForm({ email: "", password: "" });
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/clients/${client.id}/portal-user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse<PortalUserInfo | null>(res);
      setPortalDialog(d => ({ ...d, existingUser: data, isLoading: false }));
      if (data?.email) setPortalForm(f => ({ ...f, email: data.email }));
    } catch {
      setPortalDialog(d => ({ ...d, isLoading: false }));
    }
  };

  const handlePortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalDialog.clientId) return;
    setIsPortalSubmitting(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/clients/${portalDialog.clientId}/portal-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(portalForm),
      });
      const data = await parseApiResponse<{ isNew: boolean; user: PortalUserInfo }>(res);
      toast({ title: data.isNew ? t("clients.portalCreated") : t("clients.portalUpdated") });
      setPortalDialog(d => ({ ...d, open: false }));
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("error.tryAgain"), variant: "destructive" });
    } finally {
      setIsPortalSubmitting(false);
    }
  };

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("clients.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("clients.subtitle")}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t("clients.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir={direction}>
              <DialogHeader>
                <DialogTitle>{editingClient ? t("clients.edit") : t("clients.create")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("clients.name")} *</Label>
                  <Input 
                    id="name" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("clients.phone")}</Label>
                    <Input 
                      id="phone" 
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("clients.email")}</Label>
                    <Input 
                      id="email" 
                      type="email"
                      dir="ltr"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("clients.address")}</Label>
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("clients.notes")}</Label>
                  <Textarea 
                    id="notes" 
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {t("clients.save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t("clients.search")} 
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
                  <TableHead className="text-right">{t("clients.name")}</TableHead>
                  <TableHead className="text-right">{t("clients.phone")}</TableHead>
                  <TableHead className="text-right">{t("clients.email")}</TableHead>
                  <TableHead className="text-right">{t("clients.address")}</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredClients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("clients.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients?.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell><span dir="ltr">{client.phone || "-"}</span></TableCell>
                      <TableCell><span dir="ltr">{client.email || "-"}</span></TableCell>
                      <TableCell className="max-w-[200px] truncate" title={client.address || ""}>{client.address || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("clients.portalManage")}
                            onClick={() => openPortalDialog(client)}
                          >
                            <KeyRound className="w-4 h-4 text-orange-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir={direction}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("clients.deleteWarning")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ id: client.id })}
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

      <Dialog open={portalDialog.open} onOpenChange={(open) => setPortalDialog(d => ({ ...d, open }))}>
        <DialogContent dir={direction} className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-orange-500" />
              {t("clients.portalAccount")}
            </DialogTitle>
          </DialogHeader>
          {portalDialog.isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm">
                <span className="text-muted-foreground">{t("clients.client")}: </span>
                <span className="font-medium">{portalDialog.clientName}</span>
              </div>

              {portalDialog.existingUser && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-medium">{t("clients.existingAccount")} </span>
                    <span dir="ltr">{portalDialog.existingUser.email}</span>
                  </div>
                  <Badge variant="outline" className="mr-auto text-xs">{t("clients.active")}</Badge>
                </div>
              )}

              <form onSubmit={handlePortalSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portal-email">
                    {portalDialog.existingUser ? t("clients.newEmail") : t("clients.email")}
                  </Label>
                  <Input
                    id="portal-email"
                    type="email"
                    dir="ltr"
                    required
                    value={portalForm.email}
                    onChange={(e) => setPortalForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal-password">
                    {portalDialog.existingUser ? t("clients.newPassword") : t("clients.password")}
                  </Label>
                  <Input
                    id="portal-password"
                    type="password"
                    dir="ltr"
                    required
                    value={portalForm.password}
                    onChange={(e) => setPortalForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={t("clients.passwordPlaceholder")}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPortalSubmitting}>
                  {portalDialog.existingUser ? t("clients.updatePortal") : t("clients.createPortal")}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center">
                {t("clients.portalLink")} <span dir="ltr" className="font-mono">/client/login</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
