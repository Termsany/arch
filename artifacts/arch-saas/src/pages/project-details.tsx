import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetProject, 
  useGetProjectStages, 
  useUpdateStage,
  useGetProjectFeedback,
  useCreateProjectFeedback,
  useGetProjectEstimates,
  useCreateProjectEstimate,
  useDeleteEstimate,
  getGetProjectStagesQueryKey,
  getGetProjectFeedbackQueryKey,
  getGetProjectEstimatesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { parseApiResponse } from "@/lib/api-response";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, PlayCircle, AlertCircle, MessageSquare, Plus, Trash2, Upload, Download, Star, Eye, EyeOff, Paperclip, BookOpen, FileText, ClipboardList, Receipt } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fetchProjectTasks, updateTaskStatus, type ProjectTask, type TaskStatus } from "@/lib/tasks";
import { fetchProjectInvoices, formatAmount, STATUS_LABELS as INVOICE_STATUS_LABELS, type Invoice } from "@/lib/invoices";

interface StageApproval {
  id: number;
  stageId: number;
  clientId: number;
  approvalStatus: string;
  comment: string | null;
  approvedAt: string | null;
}

interface ProjectFile {
  id: number;
  projectId: number;
  stageId: number | null;
  stageName?: string | null;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl?: string | null;
  storageProvider?: string | null;
  fileType: string;
  fileSize: number;
  versionNumber: number;
  visibility: "internal" | "client_visible";
  fileCategory: string;
  notes: string | null;
  isApprovedVersion: boolean;
  createdAt: string;
}

interface BoqLibraryItem {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  itemName: string;
  defaultUnit?: string | null;
  defaultMaterialCost?: string | null;
  defaultLaborCost?: string | null;
  defaultWastePercentage?: string | null;
  defaultProfitMargin?: string | null;
}

interface BoqCategory {
  id: number;
  name: string;
}

interface ProjectDocument {
  id: number;
  projectId: number;
  documentType: "quotation" | "project_report" | "boq" | "invoice";
  title: string;
  createdAt: string;
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "مطلوب",
  in_progress: "جاري العمل",
  review: "مراجعة",
  done: "مكتملة",
};

const TASK_PRIORITY_LABELS: Record<ProjectTask["priority"], string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

function StageStatusIcon({ status }: { status: string }) {
  if (status === "مكتملة" || status === "تمت الموافقة") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === "جاري العمل") return <PlayCircle className="w-5 h-5 text-blue-500" />;
  if (status === "في انتظار موافقة العميل") return <Clock className="w-5 h-5 text-orange-500" />;
  if (status === "يحتاج تعديل") return <AlertCircle className="w-5 h-5 text-rose-500" />;
  return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-normal">تمت الموافقة</Badge>;
  if (status === "revision_requested") return <Badge variant="destructive" className="text-xs font-normal">طلب تعديل</Badge>;
  if (status === "pending") return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs font-normal">ينتظر رد العميل</Badge>;
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetails() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stages, isLoading: stagesLoading } = useGetProjectStages(projectId);
  const { data: feedbacks, isLoading: feedbackLoading } = useGetProjectFeedback(projectId);
  const { data: estimatesData, isLoading: estimatesLoading } = useGetProjectEstimates(projectId);

  const estimates = estimatesData?.items ?? [];
  const estimatesTotal = estimatesData?.totalCost ?? 0;

  const [approvals, setApprovals] = useState<StageApproval[]>([]);
  useEffect(() => {
    if (!projectId) return;
    const token = localStorage.getItem("token") || "";
    fetch(`/api/projects/${projectId}/approvals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? parseApiResponse<StageApproval[]>(r) : [])
      .then(setApprovals)
      .catch(() => {});
  }, [projectId, stages]);

  const approvalByStage = (stageId: number) => approvals.find(a => a.stageId === stageId);
  const updateStageMutation = useUpdateStage();
  const handleUpdateStageStatus = (stageId: number, status: string) => {
    updateStageMutation.mutate(
      { stageId, data: { status } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectStagesQueryKey(projectId) }); toast({ title: "تم تحديث حالة المرحلة" }); } }
    );
  };

  const [feedbackForm, setFeedbackForm] = useState({ stageId: "all", feedbackText: "", feedbackType: "ملاحظة عامة" });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const createFeedbackMutation = useCreateProjectFeedback();
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFeedbackMutation.mutate(
      { id: projectId, data: { stageId: feedbackForm.stageId === "all" ? null : parseInt(feedbackForm.stageId), feedbackText: feedbackForm.feedbackText, feedbackType: feedbackForm.feedbackType } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectFeedbackQueryKey(projectId) }); toast({ title: "تم إضافة الملاحظة بنجاح" }); setIsFeedbackOpen(false); setFeedbackForm({ stageId: "all", feedbackText: "", feedbackType: "ملاحظة عامة" }); } }
    );
  };

  const [boqLibrary, setBoqLibrary] = useState<BoqLibraryItem[]>([]);
  const [boqCategories, setBoqCategories] = useState<BoqCategory[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/boq/library", { headers: h }).then(r => r.ok ? parseApiResponse<BoqLibraryItem[]>(r) : []),
      fetch("/api/boq/categories", { headers: h }).then(r => r.ok ? parseApiResponse<BoqCategory[]>(r) : [])
    ]).then(([lib, cats]) => { setBoqLibrary(lib); setBoqCategories(cats); }).catch(() => {});
  }, []);

  const defaultEstimateForm = { phaseName: "", itemName: "", quantity: 1, unit: "", materialUnitCost: 0, laborUnitCost: 0, wastePercentage: 0, profitMargin: 0, categoryId: "", notes: "" };
  const [estimateForm, setEstimateForm] = useState(defaultEstimateForm);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const createEstimateMutation = useCreateProjectEstimate();
  const deleteEstimateMutation = useDeleteEstimate();

  const boqCalc = () => {
    const unitCostBeforeProfit = estimateForm.materialUnitCost + estimateForm.laborUnitCost;
    const totalCostBeforeProfit = estimateForm.quantity * unitCostBeforeProfit * (1 + estimateForm.wastePercentage / 100);
    const totalPrice = totalCostBeforeProfit * (1 + estimateForm.profitMargin / 100);
    return { unitCostBeforeProfit, totalCostBeforeProfit, totalPrice };
  };

  const applyLibraryItem = (itemId: string) => {
    if (itemId === "none") return;
    const item = boqLibrary.find(it => it.id === parseInt(itemId));
    if (!item) return;
    setEstimateForm(f => ({
      ...f,
      itemName: item.itemName,
      unit: item.defaultUnit || f.unit,
      materialUnitCost: parseFloat(item.defaultMaterialCost || "0"),
      laborUnitCost: parseFloat(item.defaultLaborCost || "0"),
      wastePercentage: parseFloat(item.defaultWastePercentage || "0"),
      profitMargin: parseFloat(item.defaultProfitMargin || "0"),
      categoryId: item.categoryId ? String(item.categoryId) : f.categoryId,
      phaseName: item.categoryName || f.phaseName
    }));
  };

  const handleEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { unitCostBeforeProfit, totalCostBeforeProfit, totalPrice } = boqCalc();
    const estimatePayload = {
      phaseName: estimateForm.phaseName,
      itemName: estimateForm.itemName,
      quantity: estimateForm.quantity,
      unit: estimateForm.unit,
      notes: estimateForm.notes,
      categoryId: estimateForm.categoryId ? parseInt(estimateForm.categoryId) : undefined,
      materialUnitCost: estimateForm.materialUnitCost,
      laborUnitCost: estimateForm.laborUnitCost,
      wastePercentage: estimateForm.wastePercentage,
      profitMargin: estimateForm.profitMargin,
      unitPrice: unitCostBeforeProfit,
      totalCostBeforeProfit,
      totalPrice,
    } as any;
    createEstimateMutation.mutate(
      { id: projectId, data: estimatePayload },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectEstimatesQueryKey(projectId) }); toast({ title: "تم إضافة البند للمقايسة" }); setIsEstimateOpen(false); setEstimateForm(defaultEstimateForm); } }
    );
  };

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({ stageId: "none", fileCategory: "Other", notes: "", visibility: "internal" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadFiles = () => {
    const token = localStorage.getItem("token") || "";
    fetch(`/api/projects/${projectId}/files`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? parseApiResponse<ProjectFile[]>(r) : [])
      .then((data: ProjectFile[]) => setFiles(data))
      .catch(() => setFiles([]))
      .finally(() => setFilesLoading(false));
  };
  useEffect(() => { if (projectId) loadFiles(); }, [projectId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast({ title: "يرجى اختيار ملف", variant: "destructive" }); return; }
    setIsUploading(true);
    const token = localStorage.getItem("token") || "";
    const formData = new FormData();
    formData.append("file", selectedFile);
    if (uploadForm.stageId !== "none") formData.append("stageId", uploadForm.stageId);
    formData.append("fileCategory", uploadForm.fileCategory);
    formData.append("notes", uploadForm.notes);
    formData.append("visibility", uploadForm.visibility);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      await parseApiResponse(res);
      toast({ title: "تم رفع الملف بنجاح" });
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadForm({ stageId: "none", fileCategory: "Other", notes: "", visibility: "internal" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadFiles();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await parseApiResponse(res);
      toast({ title: "تم حذف الملف" });
      loadFiles();
    } catch { toast({ title: "فشل حذف الملف", variant: "destructive" }); }
  };

  const handleMarkApproved = async (fileId: number) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/files/${fileId}/mark-approved`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      await parseApiResponse(res);
      toast({ title: "تم تعيين النسخة المعتمدة" });
      loadFiles();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const handleToggleVisibility = async (fileId: number) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/files/${fileId}/toggle-client-visible`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      await parseApiResponse(res);
      loadFiles();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const groupedFiles = files.reduce<Record<string, ProjectFile[]>>((acc, f) => {
    const key = f.fileCategory;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [generatingDocument, setGeneratingDocument] = useState<"quotation" | "project_report" | null>(null);

  const loadDocuments = () => {
    const token = localStorage.getItem("token") || "";
    setDocumentsLoading(true);
    fetch(`/api/projects/${projectId}/documents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? parseApiResponse<ProjectDocument[]>(r) : [])
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocumentsLoading(false));
  };

  useEffect(() => { if (projectId) loadDocuments(); }, [projectId]);

  const handleCreateDocument = async (type: "quotation" | "project_report") => {
    const token = localStorage.getItem("token") || "";
    setGeneratingDocument(type);
    const path = type === "quotation" ? "quotation" : "project-report";
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const doc = await parseApiResponse<ProjectDocument>(res);
      toast({ title: type === "quotation" ? "تم إنشاء عرض سعر" : "تم إنشاء تقرير حالة المشروع" });
      loadDocuments();
      window.open(`/documents/${doc.id}`, "_blank");
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إنشاء مستند", variant: "destructive" });
    } finally {
      setGeneratingDocument(null);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await parseApiResponse(res);
      toast({ title: "تم حذف المستند" });
      loadDocuments();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف المستند", variant: "destructive" });
    }
  };

  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectTasksLoading, setProjectTasksLoading] = useState(true);
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([]);
  const [projectInvoicesLoading, setProjectInvoicesLoading] = useState(true);

  const loadProjectTasks = () => {
    setProjectTasksLoading(true);
    fetchProjectTasks(projectId)
      .then(setProjectTasks)
      .catch(() => setProjectTasks([]))
      .finally(() => setProjectTasksLoading(false));
  };

  useEffect(() => { if (projectId) loadProjectTasks(); }, [projectId]);

  const loadProjectInvoices = () => {
    setProjectInvoicesLoading(true);
    fetchProjectInvoices(projectId)
      .then(setProjectInvoices)
      .catch(() => setProjectInvoices([]))
      .finally(() => setProjectInvoicesLoading(false));
  };

  useEffect(() => { if (projectId) loadProjectInvoices(); }, [projectId]);

  const handleProjectTaskStatus = async (task: ProjectTask, status: TaskStatus) => {
    try {
      await updateTaskStatus(task.id, status);
      toast({ title: "تم تحديث حالة المهمة" });
      loadProjectTasks();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تحديث حالة المهمة", variant: "destructive" });
    }
  };

  if (projectLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  if (!project) return <div className="p-8 text-center text-muted-foreground">المشروع غير موجود</div>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">

        {/* Project Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.projectName}</h1>
            <p className="text-muted-foreground mt-1">العميل: <span className="font-medium text-foreground">{project.clientName}</span></p>
          </div>
          <Badge variant="outline" className="text-sm font-normal shrink-0">{project.projectStatus}</Badge>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {project.designType && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">نوع التصميم</p>
                <p className="font-semibold text-sm">{project.designType}</p>
              </CardContent>
            </Card>
          )}
          {project.areaMeters && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">المساحة</p>
                <p className="font-semibold text-sm">{project.areaMeters} م²</p>
              </CardContent>
            </Card>
          )}
          {project.totalDesignPrice && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">سعر التصميم الإجمالي</p>
                <p className="font-semibold text-sm" dir="ltr">{Number(project.totalDesignPrice).toLocaleString()} ر.س</p>
              </CardContent>
            </Card>
          )}
          {project.startDate && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">تاريخ البدء</p>
                <p className="font-semibold text-sm" dir="ltr">{new Date(project.startDate).toLocaleDateString("ar-SA")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="bg-muted/40 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">ملاحظات: </span>{project.notes}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="stages">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-7 h-auto">
            <TabsTrigger value="stages">مراحل المشروع</TabsTrigger>
            <TabsTrigger value="files">الملفات ({files.length})</TabsTrigger>
            <TabsTrigger value="boq">المقايسة</TabsTrigger>
            <TabsTrigger value="tasks">مهام المشروع</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="documents">المستندات</TabsTrigger>
            <TabsTrigger value="feedback">الملاحظات</TabsTrigger>
          </TabsList>

          {/* ── Stages Tab ── */}
          <TabsContent value="stages" className="mt-4 space-y-3">
            {stagesLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {stages?.map(stage => (
                  <Card key={stage.id} className="border-border/50 hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {stage.stageOrder}
                          </span>
                          <StageStatusIcon status={stage.status} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{stage.stageName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">{stage.status}</span>
                              {approvalByStage(stage.id) && (
                                <ApprovalBadge status={approvalByStage(stage.id)!.approvalStatus} />
                              )}
                            </div>
                          </div>
                        </div>
                        <Select value={stage.status} onValueChange={(val) => handleUpdateStageStatus(stage.id, val)}>
                          <SelectTrigger className="w-52 h-8 text-xs shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {["لم تبدأ", "جاري العمل", "في انتظار موافقة العميل", "يحتاج تعديل", "مكتملة"].map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Files Tab ── */}
          <TabsContent value="files" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{files.length} ملف</p>
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Upload className="w-4 h-4" />رفع ملف
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]" dir="rtl">
                  <DialogHeader><DialogTitle>رفع ملف جديد</DialogTitle></DialogHeader>
                  <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
                    <div>
                      <Label>الملف *</Label>
                      <Input ref={fileInputRef} type="file" className="mt-1.5" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">المرحلة (اختياري)</Label>
                        <Select value={uploadForm.stageId} onValueChange={v => setUploadForm(f => ({ ...f, stageId: v }))}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="بدون مرحلة" /></SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="none">بدون مرحلة</SelectItem>
                            {stages?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.stageName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">التصنيف</Label>
                        <Select value={uploadForm.fileCategory} onValueChange={v => setUploadForm(f => ({ ...f, fileCategory: v }))}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent dir="rtl">
                            {["2D Plans", "3D Design", "Mood Board", "Shop Drawing", "BOQ", "Contracts", "Photos", "Other"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">ظهور الملف</Label>
                      <Select value={uploadForm.visibility} onValueChange={v => setUploadForm(f => ({ ...f, visibility: v }))}>
                        <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="internal">داخلي فقط</SelectItem>
                          <SelectItem value="client_visible">مرئي للعميل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">ملاحظات</Label>
                      <Textarea className="mt-1 h-20" value={uploadForm.notes} onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={isUploading}>{isUploading ? "جاري الرفع..." : "رفع الملف"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {filesLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : files.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد ملفات محملة بعد</p>
              </div>
            ) : (
              Object.entries(groupedFiles).map(([cat, catFiles]) => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5" />{cat}
                  </h3>
                  {catFiles.map(file => (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate max-w-xs">{file.originalName}</p>
                          {file.isApprovedVersion && (
                            <Badge className="text-[10px] py-0 h-4 bg-emerald-100 text-emerald-800 border-emerald-200">معتمد</Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] py-0 h-4 ${file.visibility === "client_visible" ? "border-blue-300 text-blue-700 bg-blue-50" : "text-muted-foreground"}`}>
                            {file.visibility === "client_visible" ? "مرئي للعميل" : "داخلي"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBytes(file.fileSize)} • v{file.versionNumber}{file.stageName ? ` • ${file.stageName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="تحميل"
                          onClick={() => window.open(file.fileUrl || `/api${file.filePath}`, "_blank")}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          title={file.visibility === "client_visible" ? "إخفاء عن العميل" : "إظهار للعميل"}
                          onClick={() => handleToggleVisibility(file.id)}>
                          {file.visibility === "client_visible"
                            ? <Eye className="w-3.5 h-3.5 text-blue-500" />
                            : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="تعيين كنسخة معتمدة"
                          onClick={() => handleMarkApproved(file.id)}>
                          <Star className={`w-3.5 h-3.5 ${file.isApprovedVersion ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل تريد حذف هذا الملف؟</AlertDialogTitle>
                              <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteFile(file.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </TabsContent>

          {/* ── BOQ Tab ── */}
          <TabsContent value="boq" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                الإجمالي: <span className="font-bold text-foreground" dir="ltr">{Number(estimatesTotal).toLocaleString()} ر.س</span>
              </p>
              <Dialog open={isEstimateOpen} onOpenChange={setIsEstimateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />إضافة بند</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader><DialogTitle>إضافة بند للمقايسة</DialogTitle></DialogHeader>
                  <form onSubmit={handleEstimateSubmit} className="space-y-4 mt-2">
                    <div>
                      <Label className="text-xs">اختر من المكتبة (اختياري)</Label>
                      <Select onValueChange={applyLibraryItem}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="اختر بنداً من المكتبة..." /></SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="none">-- بدون --</SelectItem>
                          {boqLibrary.map(item => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.categoryName ? `${item.categoryName} — ` : ""}{item.itemName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">المرحلة / الفئة *</Label>
                        <Input required className="mt-1 h-9" value={estimateForm.phaseName}
                          onChange={e => setEstimateForm(f => ({ ...f, phaseName: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">اسم البند *</Label>
                        <Input required className="mt-1 h-9" value={estimateForm.itemName}
                          onChange={e => setEstimateForm(f => ({ ...f, itemName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">الكمية</Label>
                        <Input type="number" min="0" step="0.01" className="mt-1 h-9" value={estimateForm.quantity}
                          onChange={e => setEstimateForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">الوحدة</Label>
                        <Input className="mt-1 h-9" value={estimateForm.unit}
                          onChange={e => setEstimateForm(f => ({ ...f, unit: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">الفئة</Label>
                        <Select value={estimateForm.categoryId || "none"} onValueChange={v => setEstimateForm(f => ({ ...f, categoryId: v === "none" ? "" : v }))}>
                          <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="بدون" /></SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="none">بدون</SelectItem>
                            {boqCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">تكلفة المواد (للوحدة)</Label>
                        <Input type="number" min="0" step="0.01" className="mt-1 h-9" value={estimateForm.materialUnitCost}
                          onChange={e => setEstimateForm(f => ({ ...f, materialUnitCost: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">تكلفة العمالة (للوحدة)</Label>
                        <Input type="number" min="0" step="0.01" className="mt-1 h-9" value={estimateForm.laborUnitCost}
                          onChange={e => setEstimateForm(f => ({ ...f, laborUnitCost: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">نسبة الهدر %</Label>
                        <Input type="number" min="0" max="100" step="0.1" className="mt-1 h-9" value={estimateForm.wastePercentage}
                          onChange={e => setEstimateForm(f => ({ ...f, wastePercentage: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">هامش الربح %</Label>
                        <Input type="number" min="0" max="100" step="0.1" className="mt-1 h-9" value={estimateForm.profitMargin}
                          onChange={e => setEstimateForm(f => ({ ...f, profitMargin: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    {/* Live Calculation Preview */}
                    <div className="bg-muted/60 rounded-lg p-3 text-xs space-y-1.5 border border-border">
                      <p className="font-semibold text-sm mb-2">معاينة الحساب</p>
                      <div className="flex justify-between text-muted-foreground">
                        <span>سعر الوحدة (قبل الربح)</span>
                        <span className="text-foreground font-medium" dir="ltr">{boqCalc().unitCostBeforeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>الإجمالي (قبل الربح)</span>
                        <span className="text-foreground font-medium" dir="ltr">{boqCalc().totalCostBeforeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-1">
                        <span>السعر النهائي</span>
                        <span className="text-primary" dir="ltr">{boqCalc().totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">ملاحظات</Label>
                      <Textarea className="mt-1 h-16" value={estimateForm.notes}
                        onChange={e => setEstimateForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEstimateOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createEstimateMutation.isPending}>إضافة البند</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {estimatesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !estimates.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد بنود مقايسة بعد</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المرحلة</TableHead>
                      <TableHead className="text-right">البند</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الوحدة</TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates.map(est => (
                      <TableRow key={est.id}>
                        <TableCell className="text-sm text-muted-foreground">{est.phaseName}</TableCell>
                        <TableCell className="text-sm font-medium">{est.itemName}</TableCell>
                        <TableCell className="text-sm">{est.quantity}</TableCell>
                        <TableCell className="text-sm">{est.unit}</TableCell>
                        <TableCell className="text-sm" dir="ltr">{Number(est.unitPrice).toLocaleString()} ر.س</TableCell>
                        <TableCell className="text-sm font-semibold text-primary" dir="ltr">{Number(est.totalPrice).toLocaleString()} ر.س</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل تريد حذف هذا البند؟</AlertDialogTitle>
                                <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEstimateMutation.mutate(
                                    { estimateId: est.id },
                                    { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectEstimatesQueryKey(projectId) }); toast({ title: "تم حذف البند" }); } }
                                  )}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-border bg-muted/30 flex justify-end">
                  <p className="text-sm font-bold">
                    الإجمالي الكلي: <span className="text-primary" dir="ltr">{Number(estimatesTotal).toLocaleString()} ر.س</span>
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tasks Tab ── */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">مهام المشروع</h2>
                <p className="text-sm text-muted-foreground">المهام المرتبطة بهذا المشروع ومراحله</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/tasks?project_id=${projectId}`}>كل المهام</a>
              </Button>
            </div>
            {projectTasksLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : projectTasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد مهام مرتبطة بهذا المشروع</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عنوان المهمة</TableHead>
                      <TableHead className="text-right">المرحلة</TableHead>
                      <TableHead className="text-right">المسؤول</TableHead>
                      <TableHead className="text-right">الأولوية</TableHead>
                      <TableHead className="text-right">تاريخ التسليم</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.stageName || "-"}</TableCell>
                        <TableCell>{task.assignedToName || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{TASK_PRIORITY_LABELS[task.priority]}</Badge></TableCell>
                        <TableCell dir="ltr">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "-"}</TableCell>
                        <TableCell>
                          <Select value={task.status} onValueChange={(value) => handleProjectTaskStatus(task, value as TaskStatus)}>
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent dir="rtl">
                              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Invoices Tab ── */}
          <TabsContent value="invoices" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">الفواتير والمدفوعات</h2>
                <p className="text-sm text-muted-foreground">فواتير المشروع والمدفوعات اليدوية المسجلة عليها</p>
              </div>
              <Button size="sm" className="gap-2" asChild>
                <a href={`/projects/${projectId}/invoices/new`}><Receipt className="w-4 h-4" />فاتورة جديدة</a>
              </Button>
            </div>
            {projectInvoicesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : projectInvoices.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد فواتير مرتبطة بهذا المشروع</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">إجمالي الفاتورة</TableHead>
                      <TableHead className="text-right">المدفوع</TableHead>
                      <TableHead className="text-right">المتبقي</TableHead>
                      <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell><Badge variant="outline">{INVOICE_STATUS_LABELS[invoice.status]}</Badge></TableCell>
                        <TableCell dir="ltr">{formatAmount(invoice.totalAmount)}</TableCell>
                        <TableCell dir="ltr">{formatAmount(invoice.paidAmount)}</TableCell>
                        <TableCell dir="ltr">{formatAmount(invoice.remainingAmount)}</TableCell>
                        <TableCell dir="ltr">{invoice.dueDate || "-"}</TableCell>
                        <TableCell><Button variant="outline" size="sm" asChild><a href={`/invoices/${invoice.id}`}>عرض</a></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Documents Tab ── */}
          <TabsContent value="documents" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">المستندات والتقارير</h2>
                <p className="text-sm text-muted-foreground">إنشاء مستندات عربية قابلة للطباعة من بيانات المشروع والمقايسة.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleCreateDocument("quotation")}
                  disabled={generatingDocument !== null}
                >
                  <FileText className="w-4 h-4" />
                  {generatingDocument === "quotation" ? "جاري الإنشاء..." : "إنشاء عرض سعر"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleCreateDocument("project_report")}
                  disabled={generatingDocument !== null}
                >
                  <FileText className="w-4 h-4" />
                  {generatingDocument === "project_report" ? "جاري الإنشاء..." : "إنشاء تقرير حالة المشروع"}
                </Button>
              </div>
            </div>

            {documentsLoading ? (
              <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد مستندات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <Card key={doc.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="font-normal">
                                {doc.documentType === "quotation" ? "عرض سعر" : doc.documentType === "project_report" ? "تقرير حالة المشروع" : doc.documentType === "invoice" ? "فاتورة" : "مقايسة"}
                              </Badge>
                              <span>تاريخ الإنشاء: {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("ar-SA") : ""}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/documents/${doc.id}`} target="_blank" rel="noreferrer">فتح</a>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل تريد حذف هذا المستند؟</AlertDialogTitle>
                                <AlertDialogDescription>سيتم حذف نسخة المستند المحفوظة فقط ولن تتأثر بيانات المشروع.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Feedback Tab ── */}
          <TabsContent value="feedback" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{feedbacks?.length ?? 0} ملاحظة</p>
              <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />إضافة ملاحظة</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]" dir="rtl">
                  <DialogHeader><DialogTitle>إضافة ملاحظة</DialogTitle></DialogHeader>
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4 mt-2">
                    <div>
                      <Label className="text-xs">المرحلة (اختياري)</Label>
                      <Select value={feedbackForm.stageId} onValueChange={v => setFeedbackForm(f => ({ ...f, stageId: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="all">عامة (كل المراحل)</SelectItem>
                          {stages?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.stageName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">نوع الملاحظة</Label>
                      <Select value={feedbackForm.feedbackType} onValueChange={v => setFeedbackForm(f => ({ ...f, feedbackType: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent dir="rtl">
                          {["ملاحظة عامة", "طلب تعديل", "موافقة", "رسالة للعميل", "ملاحظة داخلية"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">نص الملاحظة *</Label>
                      <Textarea required className="mt-1" rows={4} value={feedbackForm.feedbackText}
                        onChange={e => setFeedbackForm(f => ({ ...f, feedbackText: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsFeedbackOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createFeedbackMutation.isPending}>حفظ الملاحظة</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {feedbackLoading ? (
              <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : !feedbacks?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد ملاحظات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map(fb => (
                  <Card key={fb.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs font-normal">{fb.feedbackType}</Badge>
                            {fb.stageName && (
                              <span className="text-xs text-muted-foreground">• {fb.stageName}</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{fb.feedbackText}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0" dir="ltr">
                          {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString("ar-SA") : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
