"use client";

import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryWithCount,
} from "@/services";
import {
  Card,
  Input,
  Label,
  Badge,
  Dialog,
  Button,
  Textarea,
  CardTitle,
  CardHeader,
  CardContent,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { toast } from "@/hooks";
import { useState } from "react";
import { useTranslation } from "@/locales";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";

interface CategoriesManagerProps {
  categories: CategoryWithCount[];
}

const colorOptions = [
  { name: "Blush", value: "#F4B8C1" },
  { name: "Sage", value: "#A8B5A2" },
  { name: "Gold", value: "#C9A84C" },
  { name: "Gray", value: "#6B7280" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Coral", value: "#F97316" },
  { name: "Teal", value: "#14B8A6" },
];

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryWithCount | null>(null);
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategoryWithCount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#C9A84C",
    description: "",
  });

  const handleOpenDialog = (category?: CategoryWithCount) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        color: category.color,
        description: category.description || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", color: "#C9A84C", description: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingCategory) {
        await updateCategory(supabase, editingCategory.id, formData);
      } else {
        await createCategory(supabase, formData);
      }

      setIsDialogOpen(false);
      router.refresh();
      toast({ title: t("categories.categorySaved") });
    } catch (error) {
      console.error("Error saving category:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const id = categoryToDelete.id;
    setCategoryToDelete(null);
    try {
      await deleteCategory(supabase, id);
      router.refresh();
      toast({ title: t("categories.categoryDeleted") });
    } catch (error) {
      console.error("Error deleting category:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => { if (!open) setCategoryToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteCategoryConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Add Category Button */}
      <Button
        onClick={() => handleOpenDialog()}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('categories.addCategory')}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('categories.editCategory') : t('categories.addNewCategory')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('categories.descriptionPlaceholder')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('categories.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t('categories.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('categories.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, color: color.value })
                    }
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('categories.descriptionOptional')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t('categories.descriptionPlaceholder')}
                rows={2}
              />
            </div>
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!formData.name}
            >
              {editingCategory ? t('settings.saveChanges') : t('categories.addCategory')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tags className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">{t('categories.noCategories')}</p>
            <p className="text-sm text-muted-foreground">
              {t('categories.noCategoriesDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <CardTitle className="font-serif text-lg">
                      {category.name}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">{t('categories.guestCountLabel', { count: category.guestCount })}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {category.description && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(category)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCategoryToDelete(category)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
