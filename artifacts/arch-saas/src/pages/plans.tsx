import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetPlans, 
  useCreatePlan, 
  useUpdatePlan, 
  useDeletePlan,
  useTogglePlanActive,
  useSetPlanRecommended,
  getGetPlansQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Star, CheckCircle2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Plans() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useGetPlans();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 1,
    maxProjects: 10,
    maxClients: 10,
    storageLimitMb: 1024,
    hasClientPortal: false,
    hasWhatsappNotifications: false,
    hasPdfReports: true,
    hasTeamRoles: false,
    hasAdvancedEstimates: false,
    isRecommended: false,
    isActive: true,
    sortOrder: 0
  });

  const createMutation = useCreatePlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlansQueryKey() });
        toast({ title: "تم الحفظ بنجاح" });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: () => toast({ title: "حدث خطأ حاول مرة أخرى", variant: "destructive" })
    }
  });

  const updateMutation = useUpdatePlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlansQueryKey() });
        toast({ title: "تم الحفظ بنجاح" });
        setIsDialogOpen(false);
        resetForm();
      },
      onError: () => toast({ title: "حدث خطأ حاول مرة أخرى", variant: "destructive" })
    }
  });

  const deleteMutation = useDeletePlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlansQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      },
      onError: () => toast({ title: "حدث خطأ حاول مرة أخرى", variant: "destructive" })
    }
  });

  const toggleActiveMutation = useTogglePlanActive({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlansQueryKey() });
        toast({ title: "تم تغيير حالة الخطة" });
      }
    }
  });

  const setRecommendedMutation = useSetPlanRecommended({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlansQueryKey() });
        toast({ title: "تم تحديث الخطة الموصى بها" });
      }
    }
  });

  const resetForm = () => {
    setFormData({
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxUsers: 1,
      maxProjects: 10,
      maxClients: 10,
      storageLimitMb: 1024,
      hasClientPortal: false,
      hasWhatsappNotifications: false,
      hasPdfReports: true,
      hasTeamRoles: false,
      hasAdvancedEstimates: false,
      isRecommended: false,
      isActive: true,
      sortOrder: 0
    });
    setEditingPlan(null);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      ...plan
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">خطط الاشتراك</h1>
            <p className="text-muted-foreground mt-1">إدارة باقات التسعير والمميزات</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة خطة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "تعديل خطة الاشتراك" : "إضافة خطة جديدة"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold text-lg">البيانات الأساسية</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nameAr">الاسم (عربي) *</Label>
                      <Input required value={formData.nameAr} onChange={e => setFormData({...formData, nameAr: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nameEn">الاسم (انجليزي)</Label>
                      <Input value={formData.nameEn || ""} onChange={e => setFormData({...formData, nameEn: e.target.value})} dir="ltr"/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionAr">الوصف</Label>
                    <Textarea value={formData.descriptionAr || ""} onChange={e => setFormData({...formData, descriptionAr: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>السعر الشهري ($)</Label>
                      <Input type="number" required value={formData.monthlyPrice} onChange={e => setFormData({...formData, monthlyPrice: parseFloat(e.target.value)})} dir="ltr"/>
                    </div>
                    <div className="space-y-2">
                      <Label>السعر السنوي ($)</Label>
                      <Input type="number" required value={formData.yearlyPrice} onChange={e => setFormData({...formData, yearlyPrice: parseFloat(e.target.value)})} dir="ltr"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold text-lg">حدود الاستخدام</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>المستخدمين</Label>
                      <Input type="number" required value={formData.maxUsers} onChange={e => setFormData({...formData, maxUsers: parseInt(e.target.value)})} dir="ltr"/>
                    </div>
                    <div className="space-y-2">
                      <Label>المشاريع</Label>
                      <Input type="number" required value={formData.maxProjects} onChange={e => setFormData({...formData, maxProjects: parseInt(e.target.value)})} dir="ltr"/>
                    </div>
                    <div className="space-y-2">
                      <Label>العملاء</Label>
                      <Input type="number" required value={formData.maxClients} onChange={e => setFormData({...formData, maxClients: parseInt(e.target.value)})} dir="ltr"/>
                    </div>
                    <div className="space-y-2">
                      <Label>التخزين (MB)</Label>
                      <Input type="number" required value={formData.storageLimitMb} onChange={e => setFormData({...formData, storageLimitMb: parseInt(e.target.value)})} dir="ltr"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold text-lg">المميزات الإضافية</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox id="portal" checked={formData.hasClientPortal} onCheckedChange={c => setFormData({...formData, hasClientPortal: !!c})} />
                      <Label htmlFor="portal" className="cursor-pointer">بوابة العملاء</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox id="whatsapp" checked={formData.hasWhatsappNotifications} onCheckedChange={c => setFormData({...formData, hasWhatsappNotifications: !!c})} />
                      <Label htmlFor="whatsapp" className="cursor-pointer">إشعارات واتساب</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox id="roles" checked={formData.hasTeamRoles} onCheckedChange={c => setFormData({...formData, hasTeamRoles: !!c})} />
                      <Label htmlFor="roles" className="cursor-pointer">صلاحيات الفريق</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox id="est" checked={formData.hasAdvancedEstimates} onCheckedChange={c => setFormData({...formData, hasAdvancedEstimates: !!c})} />
                      <Label htmlFor="est" className="cursor-pointer">مقايسات متقدمة</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="active" checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: c})} />
                    <Label htmlFor="active" className="cursor-pointer">تفعيل الخطة</Label>
                  </div>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    حفظ البيانات
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans?.map((plan) => (
              <Card key={plan.id} className={`relative flex flex-col ${plan.isRecommended ? 'border-secondary border-2 shadow-md' : ''} ${!plan.isActive ? 'opacity-70' : ''}`}>
                {plan.isRecommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-current" />
                      موصى بها
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Switch 
                      checked={plan.isActive} 
                      onCheckedChange={() => toggleActiveMutation.mutate({ id: plan.id })}
                      title={plan.isActive ? "إيقاف" : "تفعيل"}
                    />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecommendedMutation.mutate({ id: plan.id })} title="تعيين كموصى بها">
                        <Star className={`w-4 h-4 ${plan.isRecommended ? 'text-secondary fill-secondary' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(plan)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الخطة</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate({ id: plan.id })} className="bg-destructive">حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{plan.nameAr}</CardTitle>
                  <div className="mt-4 flex justify-center items-baseline gap-1 text-4xl font-bold text-primary">
                    <span dir="ltr">${plan.monthlyPrice}</span>
                    <span className="text-base text-muted-foreground font-normal">/شهر</span>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{plan.maxProjects} مشروع</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{plan.maxClients} عميل</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{plan.maxUsers} مستخدم</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span dir="ltr">{plan.storageLimitMb / 1024} GB</span> مساحة تخزين
                    </li>
                    {plan.hasClientPortal && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>بوابة للعملاء</span>
                      </li>
                    )}
                    {plan.hasWhatsappNotifications && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>إشعارات واتساب</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
