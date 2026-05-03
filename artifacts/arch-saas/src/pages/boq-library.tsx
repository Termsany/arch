import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, BookOpen, Tag } from "lucide-react";

interface BoqCategory {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

interface BoqItem {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  itemName: string;
  defaultUnit?: string | null;
  defaultMaterialCost?: string | null;
  defaultLaborCost?: string | null;
  defaultWastePercentage?: string | null;
  defaultProfitMargin?: string | null;
  notes?: string | null;
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" };
}

export default function BOQLibrary() {
  const [categories, setCategories] = useState<BoqCategory[]>([]);
  const [items, setItems] = useState<BoqItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Category form
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<BoqCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "", sortOrder: 0 });
  const [catSaving, setCatSaving] = useState(false);

  // Item form
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<BoqItem | null>(null);
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    itemName: "",
    defaultUnit: "",
    defaultMaterialCost: 0,
    defaultLaborCost: 0,
    defaultWastePercentage: 0,
    defaultProfitMargin: 0,
    notes: "",
  });
  const [itemSaving, setItemSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch("/api/boq/categories", { headers: authHeaders() }),
        fetch("/api/boq/library", { headers: authHeaders() }),
      ]);
      setCategories(catRes.ok ? await catRes.json() : []);
      setItems(itemRes.ok ? await itemRes.json() : []);
    } catch {
      toast({ title: "تعذّر التحميل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Category CRUD ────────────────────────────────────────────────
  const openNewCat = () => {
    setEditCat(null);
    setCatForm({ name: "", description: "", sortOrder: categories.length });
    setCatOpen(true);
  };
  const openEditCat = (cat: BoqCategory) => {
    setEditCat(cat);
    setCatForm({ name: cat.name, description: cat.description || "", sortOrder: cat.sortOrder ?? 0 });
    setCatOpen(true);
  };
  const saveCat = async () => {
    if (!catForm.name.trim()) { toast({ title: "اسم التصنيف مطلوب", variant: "destructive" }); return; }
    setCatSaving(true);
    try {
      const url = editCat ? `/api/boq/categories/${editCat.id}` : "/api/boq/categories";
      const method = editCat ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(catForm) });
      if (!res.ok) throw new Error();
      toast({ title: editCat ? "تم تحديث التصنيف" : "تم إضافة التصنيف" });
      setCatOpen(false);
      load();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setCatSaving(false);
    }
  };
  const deleteCat = async (id: number) => {
    try {
      await fetch(`/api/boq/categories/${id}`, { method: "DELETE", headers: authHeaders() });
      toast({ title: "تم حذف التصنيف" });
      load();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  // ─── Item CRUD ────────────────────────────────────────────────────
  const openNewItem = () => {
    setEditItem(null);
    setItemForm({ categoryId: "", itemName: "", defaultUnit: "", defaultMaterialCost: 0, defaultLaborCost: 0, defaultWastePercentage: 0, defaultProfitMargin: 0, notes: "" });
    setItemOpen(true);
  };
  const openEditItem = (it: BoqItem) => {
    setEditItem(it);
    setItemForm({
      categoryId: it.categoryId ? String(it.categoryId) : "",
      itemName: it.itemName,
      defaultUnit: it.defaultUnit || "",
      defaultMaterialCost: parseFloat(it.defaultMaterialCost || "0"),
      defaultLaborCost: parseFloat(it.defaultLaborCost || "0"),
      defaultWastePercentage: parseFloat(it.defaultWastePercentage || "0"),
      defaultProfitMargin: parseFloat(it.defaultProfitMargin || "0"),
      notes: it.notes || "",
    });
    setItemOpen(true);
  };
  const saveItem = async () => {
    if (!itemForm.itemName.trim()) { toast({ title: "اسم البند مطلوب", variant: "destructive" }); return; }
    setItemSaving(true);
    try {
      const url = editItem ? `/api/boq/library/${editItem.id}` : "/api/boq/library";
      const method = editItem ? "PUT" : "POST";
      const body = {
        ...itemForm,
        categoryId: itemForm.categoryId ? parseInt(itemForm.categoryId) : null,
      };
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: editItem ? "تم تحديث البند" : "تم إضافة البند للمكتبة" });
      setItemOpen(false);
      load();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setItemSaving(false);
    }
  };
  const deleteItem = async (id: number) => {
    try {
      await fetch(`/api/boq/library/${id}`, { method: "DELETE", headers: authHeaders() });
      toast({ title: "تم حذف البند" });
      load();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const grouped = categories.map(cat => ({
    cat,
    items: items.filter(it => it.categoryId === cat.id),
  }));
  const uncategorized = items.filter(it => !it.categoryId);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">مكتبة المقايسة</h1>
            <p className="text-muted-foreground mt-1">إدارة تصنيفات البنود ومكتبة الأسعار الافتراضية</p>
          </div>
        </div>

        <Tabs defaultValue="items">
          <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 mb-6">
            <TabsTrigger value="items" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              بنود المكتبة
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              تصنيفات البنود
            </TabsTrigger>
          </TabsList>

          {/* ─── Items Tab ─────────────────────────────────────────────── */}
          <TabsContent value="items" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> بنود المكتبة</CardTitle>
                  <CardDescription>البنود الافتراضية مع التكاليف وهوامش الربح</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={openNewItem}>
                  <Plus className="w-4 h-4" /> إضافة بند
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                ) : items.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground border border-dashed rounded-lg">
                    <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>لا توجد بنود في المكتبة بعد</p>
                  </div>
                ) : (
                  <div className="space-y-6 mt-2">
                    {grouped.map(({ cat, items: catItems }) => catItems.length > 0 && (
                      <div key={cat.id}>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" /> {cat.name}
                        </h3>
                        <ItemRows items={catItems} onEdit={openEditItem} onDelete={deleteItem} />
                      </div>
                    ))}
                    {uncategorized.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" /> بدون تصنيف
                        </h3>
                        <ItemRows items={uncategorized} onEdit={openEditItem} onDelete={deleteItem} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Categories Tab ─────────────────────────────────────────── */}
          <TabsContent value="categories" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> تصنيفات البنود</CardTitle>
                  <CardDescription>تنظيم بنود المقايسة ضمن تصنيفات</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={openNewCat}>
                  <Plus className="w-4 h-4" /> إضافة تصنيف
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground border border-dashed rounded-lg">
                    <Tag className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>لا توجد تصنيفات بعد</p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{cat.name}</span>
                          {cat.description && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {items.filter(it => it.categoryId === cat.id).length} بند
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCat(cat)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف التصنيف</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف تصنيف "{cat.name}"؟ لن تُحذف البنود المرتبطة به.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCat(cat.id)} className="bg-destructive">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Category Dialog ─────────────────────────────────────────── */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editCat ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>اسم التصنيف *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: أعمال الكهرباء" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea rows={2} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input type="number" dir="ltr" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
            </div>
            <Button className="w-full" onClick={saveCat} disabled={catSaving}>
              {catSaving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Item Dialog ─────────────────────────────────────────────── */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل البند" : "إضافة بند للمكتبة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم البند *</Label>
                <Input value={itemForm.itemName} onChange={e => setItemForm(f => ({ ...f, itemName: e.target.value }))} placeholder="مثال: بلاط سيراميك" />
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={itemForm.categoryId} onValueChange={v => setItemForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="بدون تصنيف" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">بدون تصنيف</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الوحدة (م٢، مقطوعية...)</Label>
                <Input value={itemForm.defaultUnit} onChange={e => setItemForm(f => ({ ...f, defaultUnit: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>نسبة الهالك %</Label>
                <Input type="number" step="0.5" dir="ltr" value={itemForm.defaultWastePercentage} onChange={e => setItemForm(f => ({ ...f, defaultWastePercentage: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تكلفة الخامة للوحدة</Label>
                <Input type="number" step="0.01" dir="ltr" value={itemForm.defaultMaterialCost} onChange={e => setItemForm(f => ({ ...f, defaultMaterialCost: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>تكلفة المصنعية للوحدة</Label>
                <Input type="number" step="0.01" dir="ltr" value={itemForm.defaultLaborCost} onChange={e => setItemForm(f => ({ ...f, defaultLaborCost: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>هامش الربح %</Label>
              <Input type="number" step="0.5" dir="ltr" value={itemForm.defaultProfitMargin} onChange={e => setItemForm(f => ({ ...f, defaultProfitMargin: parseFloat(e.target.value) || 0 }))} />
            </div>
            {/* preview calculation */}
            <div className="bg-muted/60 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">تكلفة الوحدة قبل الربح:</span>
                <span dir="ltr" className="font-medium">{(itemForm.defaultMaterialCost + itemForm.defaultLaborCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">بعد الهالك والربح (للوحدة):</span>
                <span dir="ltr" className="font-medium text-primary">
                  {((itemForm.defaultMaterialCost + itemForm.defaultLaborCost) * (1 + itemForm.defaultWastePercentage / 100) * (1 + itemForm.defaultProfitMargin / 100)).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={saveItem} disabled={itemSaving}>
              {itemSaving ? "جارٍ الحفظ..." : "حفظ البند"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function ItemRows({ items, onEdit, onDelete }: { items: BoqItem[]; onEdit: (i: BoqItem) => void; onDelete: (id: number) => void }) {
  return (
    <div className="space-y-2">
      {items.map(it => (
        <div key={it.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 text-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{it.itemName}</span>
              {it.defaultUnit && <Badge variant="outline" className="text-xs">{it.defaultUnit}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap" dir="ltr">
              <span>خامة: {parseFloat(it.defaultMaterialCost || "0").toFixed(2)}</span>
              <span>• مصنعية: {parseFloat(it.defaultLaborCost || "0").toFixed(2)}</span>
              <span>• هالك: {it.defaultWastePercentage}%</span>
              <span>• ربح: {it.defaultProfitMargin}%</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onEdit(it)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>حذف البند</AlertDialogTitle>
                <AlertDialogDescription>هل أنت متأكد من حذف "{it.itemName}"؟</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(it.id)} className="bg-destructive">حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
