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
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Search, Building2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const SUBSCRIPTION_STATUSES = [
  { value: "trial", label: "عرض تجريبي", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "active", label: "نشط", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  { value: "past_due", label: "متأخر", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { value: "inactive", label: "غير نشط", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300" },
  { value: "cancelled", label: "ملغي", color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300" }
];

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

  return "حدث خطأ حاول مرة أخرى";
}

export default function Offices() {
  const queryClient = useQueryClient();
  const { data: offices, isLoading } = useGetOffices();
  const { data: plans } = useGetActivePlans();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    officeName: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    planId: "none",
    subscriptionStatus: "trial",
    subscriptionStart: dateOnly(new Date()),
    subscriptionEnd: ""
  });

  const createMutation = useCreateOffice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOfficesQueryKey() });
        toast({ title: "تم إنشاء المكتب وحساب مدير المكتب بنجاح" });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: (error) => toast({ title: getErrorMessage(error), variant: "destructive" })
    }
  });

  const updateMutation = useUpdateOffice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOfficesQueryKey() });
        toast({ title: "تم الحفظ بنجاح" });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: (error) => toast({ title: getErrorMessage(error), variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteOffice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOfficesQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      },
      onError: (error) => toast({ title: getErrorMessage(error), variant: "destructive" })
    }
  });

  const resetForm = () => {
    setFormData({
      officeName: "",
      ownerName: "",
      phone: "",
      email: "",
      password: "",
      address: "",
      planId: "none",
      subscriptionStatus: "trial",
      subscriptionStart: dateOnly(new Date()),
      subscriptionEnd: ""
    });
    setEditingOffice(null);
  };

  const handleEdit = (office: any) => {
    setEditingOffice(office);
    setFormData({
      officeName: office.officeName,
      ownerName: office.ownerName || "",
      phone: office.phone || "",
      email: office.email || "",
      password: "",
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

    if (!editingOffice && formData.password.length < 8) {
      toast({ title: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }
    
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
      createMutation.mutate({ data: { ...payload, password: formData.password } });
    }
  };

  const filteredOffices = offices?.filter(o => 
    o.officeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.ownerName && o.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const s = SUBSCRIPTION_STATUSES.find(x => x.value === status);
    if (!s) return null;
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">المكاتب المشتركة</h1>
            <p className="text-muted-foreground mt-1">إدارة مكاتب التصميم المشتركة في المنصة</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة مكتب
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingOffice ? "تعديل بيانات المكتب" : "إضافة مكتب جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="officeName">اسم المكتب *</Label>
                    <Input required value={formData.officeName} onChange={e => setFormData({...formData, officeName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">اسم المالك / المدير *</Label>
                    <Input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <Input required type="email" dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                {!editingOffice && (
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة مرور مدير المكتب *</Label>
                    <Input
                      id="password"
                      type="password"
                      dir="ltr"
                      minLength={8}
                      required
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">سيتم إنشاء حساب office_admin بهذا البريد وهذه كلمة المرور.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>تفاصيل الاشتراك</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label className="text-xs">الخطة</Label>
                      <Select value={formData.planId} onValueChange={v => setFormData({...formData, planId: v})}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="بدون خطة" /></SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="none">بدون خطة</SelectItem>
                          {plans?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nameAr}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">حالة الاشتراك</Label>
                      <Select value={formData.subscriptionStatus} onValueChange={v => setFormData({...formData, subscriptionStatus: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent dir="rtl">
                          {SUBSCRIPTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">تاريخ البداية</Label>
                      <Input type="date" dir="ltr" className="h-9 text-sm" value={formData.subscriptionStart} onChange={e => setFormData({...formData, subscriptionStart: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">تاريخ الانتهاء</Label>
                      <Input type="date" dir="ltr" className="h-9 text-sm" value={formData.subscriptionEnd} onChange={e => setFormData({...formData, subscriptionEnd: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    حفظ البيانات
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
                placeholder="ابحث باسم المكتب..." 
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
                  <TableHead className="text-right">اسم المكتب</TableHead>
                  <TableHead className="text-right">المالك</TableHead>
                  <TableHead className="text-right">التواصل</TableHead>
                  <TableHead className="text-right">خطة الاشتراك</TableHead>
                  <TableHead className="text-right">حالة الاشتراك</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
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
                      لا يوجد مكاتب
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
                          <span className="text-muted-foreground text-sm">لا يوجد خطة</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(office.subscriptionStatus)}
                          {office.subscriptionEnd && (
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {new Date(office.subscriptionEnd).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(office)} title="تعديل">
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="حذف">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  لا يمكن التراجع عن هذا الإجراء بعد تنفيذه. سيتم حذف بيانات المكتب نهائياً.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2 sm:gap-0">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ id: office.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
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
