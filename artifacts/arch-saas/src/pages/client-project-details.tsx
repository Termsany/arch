import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useClientAuth } from "@/hooks/use-client-auth";
import {
  getClientProject,
  getClientProjectStages,
  getClientProjectFeedback,
  getClientProjectFiles,
  approveStage,
  requestRevision,
  type ClientProject,
  type ClientStage,
  type ClientFeedbackItem,
  type ClientFile,
} from "@/lib/client-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, PlayCircle, AlertCircle, MessageSquare,
  ArrowRight, LogOut, ThumbsUp, RotateCcw, Download, Star, Paperclip
} from "lucide-react";

function StageStatusIcon({ status }: { status: string }) {
  if (status === "مكتملة" || status === "تمت الموافقة") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === "جاري العمل") return <PlayCircle className="w-5 h-5 text-blue-500" />;
  if (status === "في انتظار موافقة العميل") return <Clock className="w-5 h-5 text-orange-500" />;
  if (status === "يحتاج تعديل") return <AlertCircle className="w-5 h-5 text-rose-500" />;
  return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
}

function ApprovalBadge({ approvalStatus }: { approvalStatus?: string | null }) {
  if (!approvalStatus) return null;
  if (approvalStatus === "approved")
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">تمت الموافقة</Badge>;
  if (approvalStatus === "revision_requested")
    return <Badge variant="destructive" className="text-xs">تم طلب تعديل</Badge>;
  if (approvalStatus === "pending")
    return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">في انتظار ردك</Badge>;
  return null;
}

export default function ClientProjectDetails() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const { logoutClient, clientUser } = useClientAuth();
  const [, setLocation] = useLocation();

  const [project, setProject] = useState<ClientProject | null>(null);
  const [stages, setStages] = useState<ClientStage[]>([]);
  const [feedbacks, setFeedbacks] = useState<ClientFeedbackItem[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: "approve" | "revision"; stage: ClientStage | null }>({
    open: false, type: "approve", stage: null,
  });
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [proj, stgs, fbs, fls] = await Promise.all([
        getClientProject(projectId),
        getClientProjectStages(projectId),
        getClientProjectFeedback(projectId),
        getClientProjectFiles(projectId),
      ]);
      setProject(proj);
      setStages(stgs);
      setFeedbacks(fbs);
      setFiles(fls);
    } catch {
      toast({ title: "تعذّر تحميل بيانات المشروع", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  useEffect(() => {
    loadData();
  }, [projectId]);

  const openApprove = (stage: ClientStage) => {
    setComment("");
    setActionDialog({ open: true, type: "approve", stage });
  };

  const openRevision = (stage: ClientStage) => {
    setComment("");
    setActionDialog({ open: true, type: "revision", stage });
  };

  const handleSubmitAction = async () => {
    if (!actionDialog.stage) return;
    if (actionDialog.type === "revision" && !comment.trim()) {
      toast({ title: "يرجى كتابة ملاحظة التعديل", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (actionDialog.type === "approve") {
        await approveStage(actionDialog.stage.id, comment);
        toast({ title: "تمت الموافقة على المرحلة بنجاح" });
      } else {
        await requestRevision(actionDialog.stage.id, comment);
        toast({ title: "تم إرسال طلب التعديل بنجاح" });
      }
      setActionDialog({ open: false, type: "approve", stage: null });
      await loadData();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/client/projects")} className="text-muted-foreground">
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">A</div>
            <span className="font-semibold text-sm hidden sm:block truncate max-w-[200px]">{project?.projectName ?? "..."}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{clientUser?.name}</span>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={logoutClient}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" /><Skeleton className="h-20" />
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : !project ? (
          <div className="text-center py-20 text-muted-foreground">المشروع غير موجود أو ليس لديك صلاحية الوصول</div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{project.projectName}</h1>
                <Badge variant="outline">{project.projectStatus}</Badge>
              </div>
              <p className="text-muted-foreground">{project.designType}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {project.startDate && (
                <Card className="bg-primary/5 border-none shadow-none">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">تاريخ البدء</p>
                    <p className="font-semibold text-sm" dir="ltr">{new Date(project.startDate).toLocaleDateString("en-GB")}</p>
                  </CardContent>
                </Card>
              )}
              {project.areaMeters && (
                <Card className="bg-primary/5 border-none shadow-none">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">المساحة</p>
                    <p className="font-semibold text-sm" dir="ltr">{project.areaMeters} m²</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Tabs defaultValue="stages">
              <TabsList className="w-full justify-start border-b rounded-none h-11 bg-transparent p-0 mb-5">
                <TabsTrigger value="stages" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-5">
                  مراحل المشروع
                </TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-5">
                  ملفات المشروع
                </TabsTrigger>
                <TabsTrigger value="feedback" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-5">
                  سجل الملاحظات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stages" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>الخط الزمني للمراحل</CardTitle>
                    <CardDescription>يمكنك الموافقة على المراحل الجاهزة أو طلب التعديل عليها</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative border-r-2 border-border pl-0 pr-6 mr-4 space-y-6">
                      {stages.map((stage) => (
                        <div key={stage.id} className="relative">
                          <div className="absolute -right-[35px] bg-background">
                            <StageStatusIcon status={stage.status} />
                          </div>
                          <div className={`p-4 rounded-lg border ${stage.status === "في انتظار موافقة العميل" ? "border-orange-200 bg-orange-50/50" : "border-border/50 bg-muted/20"}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold">{stage.stageName}</h3>
                                  <ApprovalBadge approvalStatus={stage.approvalStatus} />
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{stage.status}</p>
                                {stage.approvalComment && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">"{stage.approvalComment}"</p>
                                )}
                              </div>

                              {stage.status === "في انتظار موافقة العميل" && (!stage.approvalStatus || stage.approvalStatus === "pending") && (
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => openApprove(stage)}
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    الموافقة
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                                    onClick={() => openRevision(stage)}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    طلب تعديل
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {stages.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">لا توجد مراحل مسجلة بعد</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>ملفات المشروع</CardTitle>
                    <CardDescription>الملفات المشتركة معك من مكتب التصميم</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {files.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                        <Paperclip className="w-7 h-7 mx-auto mb-2 opacity-40" />
                        <p>لا توجد ملفات مشتركة بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {files.map((file) => (
                          <div key={file.id} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${file.isApprovedVersion ? "border-emerald-300 bg-emerald-50/50" : "border-border/60 bg-muted/20"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate max-w-[220px]">{file.originalName}</span>
                                <Badge variant="outline" className="text-xs shrink-0">نسخة {file.versionNumber}</Badge>
                                {file.isApprovedVersion && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs shrink-0 gap-1">
                                    <Star className="w-3 h-3" /> النسخة المعتمدة
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">{file.fileCategory}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                                <span dir="ltr">{formatBytes(file.fileSize)}</span>
                                {file.stageName && <span>• {file.stageName}</span>}
                                {file.notes && <span>• {file.notes}</span>}
                              </div>
                            </div>
                            <a href={file.filePath} download={file.originalName} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                                <Download className="w-3.5 h-3.5" />
                                تحميل
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>سجل الملاحظات والموافقات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {feedbacks.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                        لا توجد ملاحظات مسجلة
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbacks.map((fb) => (
                          <div key={fb.id} className="p-4 rounded-lg border bg-card flex gap-3 items-start">
                            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge
                                  variant={fb.feedbackType === "موافقة" ? "default" : fb.feedbackType === "تعديل" ? "destructive" : "secondary"}
                                  className="text-xs font-normal"
                                >
                                  {fb.feedbackType}
                                </Badge>
                                {fb.stageName && <span className="text-xs text-muted-foreground">• {fb.stageName}</span>}
                                <span className="mr-auto text-xs text-muted-foreground" dir="ltr">
                                  {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{fb.feedbackText}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog((d) => ({ ...d, open }))}>
        <DialogContent dir="rtl" className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "approve" ? "الموافقة على المرحلة" : "طلب تعديل على المرحلة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {actionDialog.stage && (
              <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm font-medium">
                {actionDialog.stage.stageName}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionDialog.type === "approve" ? "ملاحظاتك (اختياري)" : "اكتب ملاحظتك *"}
              </label>
              <Textarea
                placeholder={actionDialog.type === "approve" ? "أي ملاحظة إضافية..." : "اذكر التعديلات المطلوبة بوضوح..."}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required={actionDialog.type === "revision"}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className={`flex-1 gap-2 ${actionDialog.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                variant={actionDialog.type === "revision" ? "destructive" : "default"}
                onClick={handleSubmitAction}
                disabled={isSubmitting}
              >
                {actionDialog.type === "approve" ? (
                  <><ThumbsUp className="w-4 h-4" /> إرسال الموافقة</>
                ) : (
                  <><RotateCcw className="w-4 h-4" /> إرسال طلب التعديل</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setActionDialog((d) => ({ ...d, open: false }))} disabled={isSubmitting}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
