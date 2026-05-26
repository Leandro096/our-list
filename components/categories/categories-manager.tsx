'use client';

import { deleteCategory, type CategoryWithCount } from '@/services';
import {
  Card,
  Badge,
  Button,
  CardTitle,
  CardHeader,
  CardContent,
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui';
import { toast } from '@/hooks';
import { useState } from 'react';
import { useTranslation } from '@/locales';
import { createClient } from '@/lib/supabase/client';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { CategoriesDialog } from './categories-dialog';

interface CategoriesManagerProps {
  categories: CategoryWithCount[];
}

export function CategoriesManager({ categories: initialCategories }: CategoriesManagerProps) {
  const supabase = createClient();
  const { t } = useTranslation();
  const [categories, setCategories] = useState(initialCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);

  const handleOpenDialog = (category?: CategoryWithCount) => {
    setEditingCategory(category ?? null);
    setIsDialogOpen(true);
  };

  const handleSaved = (saved: CategoryWithCount, isNew: boolean) => {
    setCategories((prev) =>
      isNew
        ? [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
        : prev.map((c) => (c.id === saved.id ? saved : c))
    );
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const id = categoryToDelete.id;
    setCategoryToDelete(null);
    try {
      await deleteCategory(supabase, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast({ title: t('categories.categoryDeleted') });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>{t('categories.deleteCategoryConfirm')}</AlertDialogDescription>
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

      <CategoriesDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categoryData={editingCategory || undefined}
        onSave={handleSaved}
      />

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
            <Card key={category.id} className="gap-0">
              <CardHeader className="pb-1 gap-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <CardTitle className="font-serif text-lg">{category.name}</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {t('categories.guestCountLabel', { count: category.guestCount })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                {category.description && (
                  <p className="mb-3 text-sm text-muted-foreground overflow-hidden text-ellipsis line-clamp-3">
                    {category.description}
                  </p>
                )}
                <div className="flex gap-2 mt-auto">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(category)}>
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
