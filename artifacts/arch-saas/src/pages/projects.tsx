import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetProjects, 
  useGetClients,
  useCreateProject, 
  useUpdateProject, 
  useDeleteProject,
  getGetProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Search, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";

const PROJECT_STATUSES = [
  { value: "جديد", labelKey: "project.status.new" },
  { value: "جاري", labelKey: "project.status.inProgress" },
  { value: "في انتظار موافقة العميل", labelKey: "project.status.waitingApproval" },
  { value: "يحتاج تعديل", labelKey: "project.status.needsRevision" },
  { value: "مكتمل", labelKey: "project.status.completed" },
] satisfies Array<{ value: string; labelKey: TranslationKey }>;

const DESIGN_TYPES = [
  { value: "تصميم داخلي", labelKey: "project.design.interior" },
  { value: "تصميم معماري", labelKey: "project.design.architecture" },
  { value: "تصميم واجهات", labelKey: "project.design.facades" },
  { value: "تصميم وتنفيذ كامل", labelKey: "project.design.fullDesignBuild" },
  { value: "تشطيب كامل", labelKey: "project.design.fullFinishing" },
] satisfies Array<{ value: string; labelKey: TranslationKey }>;

function translatedOption(value: string | null | undefined, options: Array<{ value: string; labelKey: TranslationKey }>, t: (key: TranslationKey) => string) {
  const option = options.find((item) => item.value === value);
  return option ? t(option.labelKey) : value || "-";
}

export default function Projects() {
  const { direction, formatCurrency, t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useGetProjects();
  const { data: clients } = useGetClients();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    clientId: "",
    projectName: "",
    designType: "تصميم داخلي",
    areaMeters: "",
    pricePerMeter: "",
    projectStatus: "جديد",
    startDate: "",
    notes: ""
  });

  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
        toast({ title: t("toast.saved") });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: () => toast({ title: t("error.tryAgain"), variant: "destructive" })
    }
  });

  const updateMutation = useUpdateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
        toast({ title: t("toast.saved") });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: () => toast({ title: t("error.tryAgain"), variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
        toast({ title: t("toast.deleted") });
      },
      onError: () => toast({ title: t("error.tryAgain"), variant: "destructive" })
    }
  });

  const resetForm = () => {
    setFormData({
      clientId: "",
      projectName: "",
      designType: "تصميم داخلي",
      areaMeters: "",
      pricePerMeter: "",
      projectStatus: "جديد",
      startDate: "",
      notes: ""
    });
    setEditingProject(null);
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      clientId: project.clientId.toString(),
      projectName: project.projectName,
      designType: project.designType,
      areaMeters: project.areaMeters ? project.areaMeters.toString() : "",
      pricePerMeter: project.pricePerMeter ? project.pricePerMeter.toString() : "",
      projectStatus: project.projectStatus,
      startDate: project.startDate || "",
      notes: project.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      clientId: parseInt(formData.clientId),
      projectName: formData.projectName,
      designType: formData.designType,
      areaMeters: formData.areaMeters ? parseFloat(formData.areaMeters) : null,
      pricePerMeter: formData.pricePerMeter ? parseFloat(formData.pricePerMeter) : null,
      projectStatus: formData.projectStatus,
      startDate: formData.startDate || null,
      notes: formData.notes || null
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const filteredProjects = projects?.filter(p => 
    p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("projects.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("projects.subtitle")}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t("projects.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir={direction}>
              <DialogHeader>
                <DialogTitle>{editingProject ? t("projects.edit") : t("projects.create")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">{t("projects.name")} *</Label>
                  <Input 
                    id="projectName" 
                    required 
                    value={formData.projectName}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientId">{t("projects.client")} *</Label>
                  <Select 
                    value={formData.clientId} 
                    onValueChange={(val) => setFormData({...formData, clientId: val})}
                    required
                  >
                    <SelectTrigger id="clientId">
                      <SelectValue placeholder={t("projects.selectClient")} />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="designType">{t("projects.designType")} *</Label>
                    <Select 
                      value={formData.designType} 
                      onValueChange={(val) => setFormData({...formData, designType: val})}
                      required
                    >
                      <SelectTrigger id="designType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        {DESIGN_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{t(type.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectStatus">{t("projects.status")} *</Label>
                    <Select 
                      value={formData.projectStatus} 
                      onValueChange={(val) => setFormData({...formData, projectStatus: val})}
                      required
                    >
                      <SelectTrigger id="projectStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir={direction}>
                        {PROJECT_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>{t(status.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="areaMeters">{t("projects.areaMeters")}</Label>
                    <Input 
                      id="areaMeters" 
                      type="number"
                      dir="ltr"
                      value={formData.areaMeters}
                      onChange={(e) => setFormData({...formData, areaMeters: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerMeter">{t("projects.pricePerMeter")}</Label>
                    <Input 
                      id="pricePerMeter" 
                      type="number"
                      dir="ltr"
                      value={formData.pricePerMeter}
                      onChange={(e) => setFormData({...formData, pricePerMeter: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("projects.startDate")}</Label>
                  <Input 
                    id="startDate" 
                    type="date"
                    dir="ltr"
                    value={formData.startDate ? formData.startDate.substring(0, 10) : ''}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("projects.notes")}</Label>
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
                placeholder={t("projects.search")} 
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
                  <TableHead className="text-right">{t("projects.name")}</TableHead>
                  <TableHead className="text-right">{t("projects.client")}</TableHead>
                  <TableHead className="text-right">{t("projects.designType")}</TableHead>
                  <TableHead className="text-right">{t("projects.status")}</TableHead>
                  <TableHead className="text-right">{t("projects.area")}</TableHead>
                  <TableHead className="text-right">{t("projects.total")}</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProjects?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {t("projects.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects?.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                          {project.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>{project.clientName}</TableCell>
                      <TableCell className="text-muted-foreground">{translatedOption(project.designType, DESIGN_TYPES, t)}</TableCell>
                      <TableCell>
                        <Badge variant={project.projectStatus === 'مكتمل' ? 'default' : 'secondary'} className="font-normal">
                          {translatedOption(project.projectStatus, PROJECT_STATUSES, t)}
                        </Badge>
                      </TableCell>
                      <TableCell><span dir="ltr">{project.areaMeters ? `${project.areaMeters} m²` : '-'}</span></TableCell>
                      <TableCell><span dir="ltr" className="font-medium text-primary">{project.totalDesignPrice ? formatCurrency(project.totalDesignPrice) : '-'}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="ghost" size="icon" title={t("projects.details")}>
                              <ExternalLink className="w-4 h-4 text-blue-500" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(project)} title={t("common.edit")}>
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
                                  {t("projects.deleteWarning")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ id: project.id })}
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
