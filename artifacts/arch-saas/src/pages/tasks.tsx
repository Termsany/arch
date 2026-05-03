import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useGetProjects, useGetProjectStages } from "@workspace/api-client-react";
import {
  createTask,
  deleteTask,
  fetchTaskAssignees,
  fetchTasks,
  updateTask,
  updateTaskStatus,
  type ProjectTask,
  type TaskAssignee,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { toast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "مطلوب",
  in_progress: "جاري العمل",
  review: "مراجعة",
  done: "مكتملة",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const emptyForm = {
  projectId: "",
  stageId: "none",
  assignedTo: "none",
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium" as TaskPriority,
  dueDate: "",
};

export default function TasksPage() {
  const { data: projects } = useGetProjects();
  const initialProjectId = new URLSearchParams(window.location.search).get("project_id") || "all";
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ project_id: initialProjectId, assigned_to: "all", status: "all", priority: "all", overdue: false });
  const selectedProjectId = Number(form.projectId || 0);
  const { data: stages } = useGetProjectStages(selectedProjectId, { query: { enabled: Boolean(selectedProjectId) } } as any);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTasks(filters);
      setTasks(data);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تحميل المهام", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    fetchTaskAssignees().then(setAssignees).catch(() => setAssignees([]));
  }, []);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const openEdit = (task: ProjectTask) => {
    setEditing(task);
    setForm({
      projectId: String(task.projectId),
      stageId: task.stageId ? String(task.stageId) : "none",
      assignedTo: task.assignedTo ? String(task.assignedTo) : "none",
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setIsOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: TaskInput = {
      projectId: Number(form.projectId),
      stageId: form.stageId === "none" ? null : Number(form.stageId),
      assignedTo: form.assignedTo === "none" ? null : Number(form.assignedTo),
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
    };
    try {
      if (editing) await updateTask(editing.id, payload);
      else await createTask(payload);
      toast({ title: editing ? "تم تحديث المهمة" : "تم إنشاء المهمة" });
      setIsOpen(false);
      reset();
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حفظ المهمة", variant: "destructive" });
    }
  };

  const setStatus = async (task: ProjectTask, status: TaskStatus) => {
    try {
      await updateTaskStatus(task.id, status);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر تحديث الحالة", variant: "destructive" });
    }
  };

  const remove = async (task: ProjectTask) => {
    try {
      await deleteTask(task.id);
      toast({ title: "تم حذف المهمة" });
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف المهمة", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">المهام</h1>
            <p className="text-muted-foreground mt-1">تعيين وتتبع مهام المشاريع والمراحل</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />مهمة جديدة</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-[560px]">
              <DialogHeader><DialogTitle>{editing ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان المهمة *</Label>
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>وصف المهمة</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>المشروع *</Label>
                    <Select value={form.projectId} onValueChange={(value) => setForm({ ...form, projectId: value, stageId: "none" })}>
                      <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
                      <SelectContent dir="rtl">
                        {projects?.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.projectName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المرحلة</Label>
                    <Select value={form.stageId} onValueChange={(value) => setForm({ ...form, stageId: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="none">بدون مرحلة</SelectItem>
                        {stages?.map((stage) => <SelectItem key={stage.id} value={String(stage.id)}>{stage.stageName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>المسؤول</Label>
                    <Select value={form.assignedTo} onValueChange={(value) => setForm({ ...form, assignedTo: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="none">بدون مسؤول</SelectItem>
                        {assignees.map((assignee) => <SelectItem key={assignee.id} value={String(assignee.id)}>{assignee.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ التسليم</Label>
                    <Input type="date" dir="ltr" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as TaskStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl">
                        {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الأولوية</Label>
                    <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value as TaskPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl">
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
                  <Button type="submit">حفظ</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Select value={filters.project_id} onValueChange={(value) => setFilters({ ...filters, project_id: value })}>
              <SelectTrigger><SelectValue placeholder="المشروع" /></SelectTrigger>
              <SelectContent dir="rtl"><SelectItem value="all">كل المشاريع</SelectItem>{projects?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.projectName}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.assigned_to} onValueChange={(value) => setFilters({ ...filters, assigned_to: value })}>
              <SelectTrigger><SelectValue placeholder="المسؤول" /></SelectTrigger>
              <SelectContent dir="rtl"><SelectItem value="all">كل المسؤولين</SelectItem>{assignees.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent dir="rtl"><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger><SelectValue placeholder="الأولوية" /></SelectTrigger>
              <SelectContent dir="rtl"><SelectItem value="all">كل الأولويات</SelectItem>{Object.entries(PRIORITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant={filters.overdue ? "default" : "outline"} onClick={() => setFilters({ ...filters, overdue: !filters.overdue })}>المهام المتأخرة</Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">لا توجد مهام</div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان المهمة</TableHead>
                  <TableHead className="text-right">المشروع</TableHead>
                  <TableHead className="text-right">المسؤول</TableHead>
                  <TableHead className="text-right">الأولوية</TableHead>
                  <TableHead className="text-right">تاريخ التسليم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.projectName}</TableCell>
                    <TableCell>{task.assignedToName || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge></TableCell>
                    <TableCell dir="ltr">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "-"}</TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={(value) => setStatus(task, value as TaskStatus)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent dir="rtl">{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}><Edit2 className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader><AlertDialogTitle>حذف المهمة؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => remove(task)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
