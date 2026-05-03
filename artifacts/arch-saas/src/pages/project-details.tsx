import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, PlayCircle, AlertCircle, MessageSquare, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const STAGE_STATUSES = ["لم تبدأ", "جاري العمل", "في انتظار موافقة العميل", "تمت الموافقة", "يحتاج تعديل", "مكتملة"];
const FEEDBACK_TYPES = ["موافقة", "تعديل", "ملاحظة عامة"];

interface StageApproval {
  id: number;
  stageId: number;
  clientId: number;
  approvalStatus: string;
  comment: string | null;
  approvedAt: string | null;
}

function StageStatusIcon({ status }: { status: string }) {
  if (status === "مكتملة" || status === "تمت الموافقة") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === "جاري العمل") return <PlayCircle className="w-5 h-5 text-blue-500" />;
  if (status === "في انتظار موافقة العميل") return <Clock className="w-5 h-5 text-orange-500" />;
  if (status === "يحتاج تعديل") return <AlertCircle className="w-5 h-5 text-rose-500" />;
  return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-normal">تمت الموافقة</Badge>;
  if (status === "revision_requested")
    return <Badge variant="destructive" className="text-xs font-normal">طلب تعديل</Badge>;
  if (status === "pending")
    return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs font-normal">ينتظر رد العميل</Badge>;
  return null;
}

export default function ProjectDetails() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: stages, isLoading: stagesLoading } = useGetProjectStages(projectId);
  const { data: feedbacks, isLoading: feedbackLoading } = useGetProjectFeedback(projectId);
  const { data: estimatesData, isLoading: estimatesLoading } = useGetProjectEstimates(projectId);

  const [approvals, setApprovals] = useState<StageApproval[]>([]);
  useEffect(() => {
    if (!projectId) return;
    const token = localStorage.getItem("token") || "";
    fetch(`/api/projects/${projectId}/approvals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setApprovals)
      .catch(() => {});
  }, [projectId, stages]);

  const approvalByStage = (stageId: number) => approvals.find(a => a.stageId === stageId);

  const updateStageMutation = useUpdateStage();
  const handleUpdateStageStatus = (stageId: number, status: string) => {
    updateStageMutation.mutate(
      { id: stageId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectStagesQueryKey(projectId) });
          toast({ title: "تم تحديث حالة المرحلة" });
        }
      }
    );
  };

  const [feedbackForm, setFeedbackForm] = useState({ stageId: "all", feedbackText: "", feedbackType: "ملاحظة عامة" });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const createFeedbackMutation = useCreateProjectFeedback();
  
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFeedbackMutation.mutate(
      { 
        projectId, 
        data: {
          stageId: feedbackForm.stageId === "all" ? null : parseInt(feedbackForm.stageId),
          feedbackText: feedbackForm.feedbackText,
          feedbackType: feedbackForm.feedbackType
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectFeedbackQueryKey(projectId) });
          toast({ title: "تم إضافة الملاحظة بنجاح" });
          setIsFeedbackOpen(false);
          setFeedbackForm({ stageId: "all", feedbackText: "", feedbackType: "ملاحظة عامة" });
        }
      }
    );
  };

  const [estimateForm, setEstimateForm] = useState({ phaseName: "", itemName: "", quantity: 1, unit: "", unitPrice: 0, notes: "" });
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const createEstimateMutation = useCreateProjectEstimate();
  const deleteEstimateMutation = useDeleteEstimate();

  const handleEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEstimateMutation.mutate(
      { projectId, data: estimateForm },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectEstimatesQueryKey(projectId) });
          toast({ title: "تم إضافة البند للمقايسة" });
          setIsEstimateOpen(false);
          setEstimateForm({ phaseName: "", itemName: "", quantity: 1, unit: "", unitPrice: 0, notes: "" });
        }
      }
    );
  };

  if (projectLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  if (!project) return <div className="p-8 text-center text-muted-foreground">المشروع غير موجود</div>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{project.projectName}</h1>
              <Badge variant="outline" className="text-sm bg-background">{project.projectStatus}</Badge>
            </div>
            <p className="text-muted-foreground text-lg">{project.clientName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">نوع التصميم</p>
              <p className="font-semibold">{project.designType}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">تاريخ البدء</p>
              <p className="font-semibold" dir="ltr">{project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB') : '-'}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">المساحة</p>
              <p className="font-semibold" dir="ltr">{project.areaMeters ? `${project.areaMeters} m²` : '-'}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">إجمالي التكلفة (التصميم)</p>
              <p className="font-semibold text-primary" dir="ltr">{project.totalDesignPrice ? `$${project.totalDesignPrice}` : '-'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="stages" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 mb-6">
            <TabsTrigger value="stages" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              مراحل المشروع
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              ملاحظات العميل
            </TabsTrigger>
            <TabsTrigger value="estimates" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              المقايسة (Estimates)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>الخط الزمني للمراحل</CardTitle>
                <CardDescription>تتبع تقدم العمل في مراحل التصميم المختلفة</CardDescription>
              </CardHeader>
              <CardContent>
                {stagesLoading ? (
                  <div className="space-y-4"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>
                ) : (
                  <div className="relative border-r-2 border-border pl-0 pr-6 mr-4 space-y-8">
                    {stages?.map((stage) => {
                      const approval = approvalByStage(stage.id);
                      return (
                        <div key={stage.id} className="relative">
                          <div className="absolute -right-[35px] bg-background">
                            <StageStatusIcon status={stage.status} />
                          </div>
                          <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-lg">{stage.stageName}</h3>
                                  {approval && <ApprovalBadge status={approval.approvalStatus} />}
                                </div>
                                {approval?.comment && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">"{approval.comment}"</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <Select 
                                  value={stage.status}
                                  onValueChange={(val) => handleUpdateStageStatus(stage.id, val)}
                                >
                                  <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent dir="rtl">
                                    {STAGE_STATUSES.map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>ملاحظات وموافقات العميل</CardTitle>
                  <CardDescription>سجل بجميع تعليقات وموافقات العميل على المشروع</CardDescription>
                </div>
                <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      إضافة ملاحظة
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة ملاحظة جديدة</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFeedbackSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>نوع الملاحظة</Label>
                        <Select value={feedbackForm.feedbackType} onValueChange={v => setFeedbackForm({...feedbackForm, feedbackType: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent dir="rtl">
                            {FEEDBACK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>المرحلة المرتبطة (اختياري)</Label>
                        <Select value={feedbackForm.stageId} onValueChange={v => setFeedbackForm({...feedbackForm, stageId: v})}>
                          <SelectTrigger><SelectValue placeholder="اختر مرحلة" /></SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="all">ملاحظة عامة على المشروع</SelectItem>
                            {stages?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.stageName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>نص الملاحظة</Label>
                        <Textarea required rows={4} value={feedbackForm.feedbackText} onChange={e => setFeedbackForm({...feedbackForm, feedbackText: e.target.value})} />
                      </div>
                      <Button type="submit" className="w-full" disabled={createFeedbackMutation.isPending}>حفظ</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? <Skeleton className="h-32 w-full"/> : feedbacks?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">لا توجد ملاحظات مسجلة</div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {feedbacks?.map(fb => (
                      <div key={fb.id} className="p-4 rounded-lg border bg-card flex gap-4 items-start">
                        <div className="mt-1">
                          <MessageSquare className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={fb.feedbackType === 'موافقة' ? 'default' : fb.feedbackType === 'تعديل' ? 'destructive' : 'secondary'} className="font-normal text-xs">
                              {fb.feedbackType}
                            </Badge>
                            {fb.stageName && <span className="text-sm text-muted-foreground">• {fb.stageName}</span>}
                            <span className="mr-auto text-xs text-muted-foreground" dir="ltr">
                              {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-sm mt-2 whitespace-pre-wrap">{fb.feedbackText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimates" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>جدول الكميات والمقايسات</CardTitle>
                  <CardDescription>حساب تكاليف التنفيذ والكميات المطلوبة</CardDescription>
                </div>
                <Dialog open={isEstimateOpen} onOpenChange={setIsEstimateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      إضافة بند
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>إضافة بند للمقايسة</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEstimateSubmit} className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>المرحلة / القسم (مثل: أعمال الكهرباء)</Label>
                          <Input required value={estimateForm.phaseName} onChange={e => setEstimateForm({...estimateForm, phaseName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>اسم البند</Label>
                          <Input required value={estimateForm.itemName} onChange={e => setEstimateForm({...estimateForm, itemName: e.target.value})} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>الكمية</Label>
                          <Input type="number" step="0.01" required value={estimateForm.quantity} onChange={e => setEstimateForm({...estimateForm, quantity: parseFloat(e.target.value)})} dir="ltr"/>
                        </div>
                        <div className="space-y-2">
                          <Label>الوحدة (م٢, مقطوعية...)</Label>
                          <Input value={estimateForm.unit} onChange={e => setEstimateForm({...estimateForm, unit: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>سعر الوحدة</Label>
                          <Input type="number" step="0.01" required value={estimateForm.unitPrice} onChange={e => setEstimateForm({...estimateForm, unitPrice: parseFloat(e.target.value)})} dir="ltr"/>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>ملاحظات</Label>
                        <Input value={estimateForm.notes} onChange={e => setEstimateForm({...estimateForm, notes: e.target.value})} />
                      </div>
                      <div className="bg-muted p-3 rounded-md text-center mt-2 font-medium">
                        الإجمالي المقدر: <span dir="ltr">${(estimateForm.quantity * estimateForm.unitPrice).toFixed(2)}</span>
                      </div>
                      <Button type="submit" className="w-full" disabled={createEstimateMutation.isPending}>حفظ البند</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {estimatesLoading ? <Skeleton className="h-64 w-full" /> : (
                  <>
                    <div className="rounded-md border overflow-hidden mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-right">القسم/المرحلة</TableHead>
                            <TableHead className="text-right">اسم البند</TableHead>
                            <TableHead className="text-right">الكمية</TableHead>
                            <TableHead className="text-right">الوحدة</TableHead>
                            <TableHead className="text-right">سعر الوحدة</TableHead>
                            <TableHead className="text-right">الإجمالي</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {estimatesData?.items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">لا توجد بنود في المقايسة</TableCell>
                            </TableRow>
                          ) : (
                            estimatesData?.items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.phaseName}</TableCell>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell><span dir="ltr">{item.quantity}</span></TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell><span dir="ltr">${item.unitPrice}</span></TableCell>
                                <TableCell className="font-semibold text-primary"><span dir="ltr">${item.totalPrice}</span></TableCell>
                                <TableCell>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>حذف البند</AlertDialogTitle>
                                        <AlertDialogDescription>هل أنت متأكد من حذف هذا البند من المقايسة؟</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="gap-2 sm:gap-0">
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteEstimateMutation.mutate(
                                          { id: item.id },
                                          { onSuccess: () => {
                                            queryClient.invalidateQueries({ queryKey: getGetProjectEstimatesQueryKey(projectId) });
                                            toast({ title: "تم الحذف بنجاح" });
                                          }}
                                        )} className="bg-destructive">حذف</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {estimatesData && estimatesData.items.length > 0 && (
                      <div className="mt-6 flex justify-end">
                        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-md flex items-center gap-4 text-xl">
                          <span className="font-medium">إجمالي المقايسة:</span>
                          <span dir="ltr" className="font-bold">${estimatesData.totalCost}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
