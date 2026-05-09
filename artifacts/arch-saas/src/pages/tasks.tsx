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
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";

const TASK_STATUS_KEYS: Record<TaskStatus, TranslationKey> = {
  todo: "task.status.todo",
  in_progress: "task.status.in_progress",
  review: "task.status.review",
  done: "task.status.done",
};

const TASK_PRIORITY_KEYS: Record<TaskPriority, TranslationKey> = {
  low: "task.priority.low",
  medium: "task.priority.medium",
  high: "task.priority.high",
  urgent: "task.priority.urgent",
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
  const { t, direction, formatDate } = useTranslation();
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
      toast({ title: err instanceof Error ? err.message : t("tasks.loadError"), variant: "destructive" });
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
      toast({ title: editing ? t("tasks.updateSuccess") : t("tasks.createSuccess") });
      setIsOpen(false);
      reset();
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("tasks.saveError"), variant: "destructive" });
    }
  };

  const setStatus = async (task: ProjectTask, status: TaskStatus) => {
    try {
      await updateTaskStatus(task.id, status);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("tasks.statusError"), variant: "destructive" });
    }
  };

  const remove = async (task: ProjectTask) => {
    try {
      await deleteTask(task.id);
      toast({ title: t("tasks.deleteSuccess") });
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("tasks.deleteError"), variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("tasks.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("tasks.subtitle")}</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />{t("tasks.new")}</Button>
            </DialogTrigger>
            <DialogContent dir={direction} className="sm:max-w-[560px]">
              <DialogHeader><DialogTitle>{editing ? t("tasks.edit") : t("tasks.new")}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("tasks.titleField")} *</Label>
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("tasks.description")}</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("tasks.project")} *</Label>
                    <Select value={form.projectId} onValueChange={(value) => setForm({ ...form, projectId: value, stageId: "none" })}>
                      <SelectTrigger><SelectValue placeholder={t("tasks.selectProject")} /></SelectTrigger>
                      <SelectContent dir={direction}>
                        {projects?.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.projectName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("tasks.stage")}</Label>
                    <Select value={form.stageId} onValueChange={(value) => setForm({ ...form, stageId: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="none">{t("tasks.noStage")}</SelectItem>
                        {stages?.map((stage) => <SelectItem key={stage.id} value={String(stage.id)}>{stage.stageName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("tasks.assignee")}</Label>
                    <Select value={form.assignedTo} onValueChange={(value) => setForm({ ...form, assignedTo: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir={direction}>
                        <SelectItem value="none">{t("tasks.noAssignee")}</SelectItem>
                        {assignees.map((assignee) => <SelectItem key={assignee.id} value={String(assignee.id)}>{assignee.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("tasks.dueDate")}</Label>
                    <Input type="date" dir="ltr" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("tasks.status")}</Label>
                    <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as TaskStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir={direction}>
                        {(Object.keys(TASK_STATUS_KEYS) as TaskStatus[]).map((value) => <SelectItem key={value} value={value}>{t(TASK_STATUS_KEYS[value])}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("tasks.priority")}</Label>
                    <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value as TaskPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent dir={direction}>
                        {(Object.keys(TASK_PRIORITY_KEYS) as TaskPriority[]).map((value) => <SelectItem key={value} value={value}>{t(TASK_PRIORITY_KEYS[value])}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit">{t("common.save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Select value={filters.project_id} onValueChange={(value) => setFilters({ ...filters, project_id: value })}>
              <SelectTrigger><SelectValue placeholder={t("tasks.project")} /></SelectTrigger>
              <SelectContent dir={direction}><SelectItem value="all">{t("tasks.allProjects")}</SelectItem>{projects?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.projectName}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.assigned_to} onValueChange={(value) => setFilters({ ...filters, assigned_to: value })}>
              <SelectTrigger><SelectValue placeholder={t("tasks.assignee")} /></SelectTrigger>
              <SelectContent dir={direction}><SelectItem value="all">{t("tasks.allAssignees")}</SelectItem>{assignees.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger><SelectValue placeholder={t("tasks.status")} /></SelectTrigger>
              <SelectContent dir={direction}><SelectItem value="all">{t("tasks.allStatuses")}</SelectItem>{(Object.keys(TASK_STATUS_KEYS) as TaskStatus[]).map((value) => <SelectItem key={value} value={value}>{t(TASK_STATUS_KEYS[value])}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger><SelectValue placeholder={t("tasks.priority")} /></SelectTrigger>
              <SelectContent dir={direction}><SelectItem value="all">{t("tasks.allPriorities")}</SelectItem>{(Object.keys(TASK_PRIORITY_KEYS) as TaskPriority[]).map((value) => <SelectItem key={value} value={value}>{t(TASK_PRIORITY_KEYS[value])}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant={filters.overdue ? "default" : "outline"} onClick={() => setFilters({ ...filters, overdue: !filters.overdue })}>{t("tasks.overdue")}</Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">{t("tasks.empty")}</div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("tasks.titleField")}</TableHead>
                  <TableHead className="text-start">{t("tasks.project")}</TableHead>
                  <TableHead className="text-start">{t("tasks.assignee")}</TableHead>
                  <TableHead className="text-start">{t("tasks.priority")}</TableHead>
                  <TableHead className="text-start">{t("tasks.dueDate")}</TableHead>
                  <TableHead className="text-start">{t("tasks.status")}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.projectName}</TableCell>
                    <TableCell>{task.assignedToName || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{t(TASK_PRIORITY_KEYS[task.priority])}</Badge></TableCell>
                    <TableCell dir="ltr">{task.dueDate ? formatDate(task.dueDate) : "-"}</TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={(value) => setStatus(task, value as TaskStatus)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent dir={direction}>{(Object.keys(TASK_STATUS_KEYS) as TaskStatus[]).map((value) => <SelectItem key={value} value={value}>{t(TASK_STATUS_KEYS[value])}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}><Edit2 className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent dir={direction}>
                            <AlertDialogHeader><AlertDialogTitle>{t("tasks.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("common.deleteWarning")}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => remove(task)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
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
