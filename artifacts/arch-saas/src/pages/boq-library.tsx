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
import { parseApiResponse } from "@/lib/api-response";
import { useTranslation } from "@/i18n/language-context";

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
  const { t, direction, formatCurrency, formatNumber } = useTranslation();
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
      setCategories(catRes.ok ? await parseApiResponse<BoqCategory[]>(catRes) : []);
      setItems(itemRes.ok ? await parseApiResponse<BoqItem[]>(itemRes) : []);
    } catch {
      toast({ title: t("common.loadError"), variant: "destructive" });
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
    if (!catForm.name.trim()) { toast({ title: t("boq.categoryRequired"), variant: "destructive" }); return; }
    setCatSaving(true);
    try {
      const url = editCat ? `/api/boq/categories/${editCat.id}` : "/api/boq/categories";
      const method = editCat ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(catForm) });
      await parseApiResponse(res);
      toast({ title: editCat ? t("boq.categoryUpdated") : t("boq.categoryCreated") });
      setCatOpen(false);
      load();
    } catch {
      toast({ title: t("error.tryAgain"), variant: "destructive" });
    } finally {
      setCatSaving(false);
    }
  };
  const deleteCat = async (id: number) => {
    try {
      await parseApiResponse(await fetch(`/api/boq/categories/${id}`, { method: "DELETE", headers: authHeaders() }));
      toast({ title: t("boq.categoryDeleted") });
      load();
    } catch {
      toast({ title: t("error.tryAgain"), variant: "destructive" });
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
    if (!itemForm.itemName.trim()) { toast({ title: t("boq.itemRequired"), variant: "destructive" }); return; }
    setItemSaving(true);
    try {
      const url = editItem ? `/api/boq/library/${editItem.id}` : "/api/boq/library";
      const method = editItem ? "PUT" : "POST";
      const body = {
        ...itemForm,
        categoryId: itemForm.categoryId && itemForm.categoryId !== "none" ? parseInt(itemForm.categoryId) : null,
      };
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      await parseApiResponse(res);
      toast({ title: editItem ? t("boq.itemUpdated") : t("boq.itemCreated") });
      setItemOpen(false);
      load();
    } catch {
      toast({ title: t("error.tryAgain"), variant: "destructive" });
    } finally {
      setItemSaving(false);
    }
  };
  const deleteItem = async (id: number) => {
    try {
      await parseApiResponse(await fetch(`/api/boq/library/${id}`, { method: "DELETE", headers: authHeaders() }));
      toast({ title: t("boq.itemDeleted") });
      load();
    } catch {
      toast({ title: t("error.tryAgain"), variant: "destructive" });
    }
  };

  const grouped = categories.map(cat => ({
    cat,
    items: items.filter(it => it.categoryId === cat.id),
  }));
  const uncategorized = items.filter(it => !it.categoryId);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto" dir={direction}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("boq.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("boq.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="items">
          <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 mb-6">
            <TabsTrigger value="items" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              {t("boq.itemsTab")}
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6">
              {t("boq.categoriesTab")}
            </TabsTrigger>
          </TabsList>

          {/* ─── Items Tab ─────────────────────────────────────────────── */}
          <TabsContent value="items" className="m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> {t("boq.libraryItems")}</CardTitle>
                  <CardDescription>{t("boq.libraryItemsDescription")}</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={openNewItem}>
                  <Plus className="w-4 h-4" /> {t("boq.addItem")}
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                ) : items.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground border border-dashed rounded-lg">
                    <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>{t("boq.emptyItems")}</p>
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
                          <Tag className="w-3.5 h-3.5" /> {t("boq.uncategorized")}
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
                  <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> {t("boq.categories")}</CardTitle>
                  <CardDescription>{t("boq.categoriesDescription")}</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={openNewCat}>
                  <Plus className="w-4 h-4" /> {t("boq.addCategory")}
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground border border-dashed rounded-lg">
                    <Tag className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>{t("boq.emptyCategories")}</p>
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
                          {formatNumber(items.filter(it => it.categoryId === cat.id).length)} {t("boq.itemsCount")}
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
                          <AlertDialogContent dir={direction}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("boq.deleteCategory")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("boq.deleteCategoryDescription")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCat(cat.id)} className="bg-destructive">{t("common.delete")}</AlertDialogAction>
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
        <DialogContent dir={direction} className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editCat ? t("boq.editCategory") : t("boq.addNewCategory")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t("boq.categoryName")} *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder={t("boq.categoryNamePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.description")}</Label>
              <Textarea rows={2} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("boq.sortOrder")}</Label>
              <Input type="number" dir="ltr" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
            </div>
            <Button className="w-full" onClick={saveCat} disabled={catSaving}>
              {catSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Item Dialog ─────────────────────────────────────────────── */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent dir={direction} className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editItem ? t("boq.editItem") : t("boq.addLibraryItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("boq.itemName")} *</Label>
                <Input value={itemForm.itemName} onChange={e => setItemForm(f => ({ ...f, itemName: e.target.value }))} placeholder={t("boq.itemNamePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("boq.category")}</Label>
                <Select value={itemForm.categoryId} onValueChange={v => setItemForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("boq.uncategorized")} /></SelectTrigger>
                  <SelectContent dir={direction}>
                    <SelectItem value="none">{t("boq.uncategorized")}</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("boq.unit")}</Label>
                <Input value={itemForm.defaultUnit} onChange={e => setItemForm(f => ({ ...f, defaultUnit: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("boq.wastePercentage")}</Label>
                <Input type="number" step="0.5" dir="ltr" value={itemForm.defaultWastePercentage} onChange={e => setItemForm(f => ({ ...f, defaultWastePercentage: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("boq.materialCost")}</Label>
                <Input type="number" step="0.01" dir="ltr" value={itemForm.defaultMaterialCost} onChange={e => setItemForm(f => ({ ...f, defaultMaterialCost: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("boq.laborCost")}</Label>
                <Input type="number" step="0.01" dir="ltr" value={itemForm.defaultLaborCost} onChange={e => setItemForm(f => ({ ...f, defaultLaborCost: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("boq.profitMargin")}</Label>
              <Input type="number" step="0.5" dir="ltr" value={itemForm.defaultProfitMargin} onChange={e => setItemForm(f => ({ ...f, defaultProfitMargin: parseFloat(e.target.value) || 0 }))} />
            </div>
            {/* preview calculation */}
            <div className="bg-muted/60 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("boq.beforeProfit")}</span>
                <span dir="ltr" className="font-medium">{formatCurrency(itemForm.defaultMaterialCost + itemForm.defaultLaborCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("boq.afterProfit")}</span>
                <span dir="ltr" className="font-medium text-primary">
                  {formatCurrency((itemForm.defaultMaterialCost + itemForm.defaultLaborCost) * (1 + itemForm.defaultWastePercentage / 100) * (1 + itemForm.defaultProfitMargin / 100))}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("boq.notes")}</Label>
              <Textarea rows={2} value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={saveItem} disabled={itemSaving}>
              {itemSaving ? t("common.saving") : t("boq.saveItem")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function ItemRows({ items, onEdit, onDelete }: { items: BoqItem[]; onEdit: (i: BoqItem) => void; onDelete: (id: number) => void }) {
  const { t, direction, formatCurrency, formatNumber } = useTranslation();

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
              <span>{t("boq.material")}: {formatCurrency(parseFloat(it.defaultMaterialCost || "0"))}</span>
              <span>• {t("boq.labor")}: {formatCurrency(parseFloat(it.defaultLaborCost || "0"))}</span>
              <span>• {t("boq.waste")}: {formatNumber(parseFloat(it.defaultWastePercentage || "0"))}%</span>
              <span>• {t("boq.profit")}: {formatNumber(parseFloat(it.defaultProfitMargin || "0"))}%</span>
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
            <AlertDialogContent dir={direction}>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("boq.deleteItem")}</AlertDialogTitle>
                <AlertDialogDescription>{t("boq.deleteItemDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(it.id)} className="bg-destructive">{t("common.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
