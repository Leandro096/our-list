'use client';

import {
  Input,
  Label,
  Button,
  Dialog,
  Textarea,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '../ui';
import { toast } from '@/hooks';
import { useTranslation } from '@/locales';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createCategory, updateCategory, type CategoryWithCount } from '@/services';

interface CategoriesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryData?: CategoryWithCount;
  onSave?: (category: CategoryWithCount, isNew: boolean) => void;
}

const colorOptions = [
  { name: 'Blush', value: '#F4B8C1' },
  { name: 'Sage', value: '#A8B5A2' },
  { name: 'Gold', value: '#C9A84C' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Coral', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
];

export function CategoriesDialog(props: CategoriesDialogProps) {
  const supabase = createClient();
  const { t } = useTranslation();

  const { isOpen, onOpenChange, categoryData, onSave } = props;
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: categoryData?.name || '',
    color: categoryData?.color || '#C9A84C',
    description: categoryData?.description || '',
  });

  useEffect(() => {
    setIsSaving(false);
    setFormData({
      name: categoryData?.name || '',
      color: categoryData?.color || '#C9A84C',
      description: categoryData?.description || '',
    });
  }, [categoryData?.id, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let saved: CategoryWithCount;
      if (categoryData?.id) {
        const category = await updateCategory(supabase, categoryData.id, formData);
        saved = { ...category, guestCount: categoryData.guestCount };
      } else {
        const category = await createCategory(supabase, formData);
        saved = { ...category, guestCount: 0 };
      }
      onOpenChange(false);
      toast({ title: t('categories.categorySaved') });
      onSave?.(saved, !categoryData?.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {categoryData ? t('categories.editCategory') : t('categories.addNewCategory')}
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    formData.color === color.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent'
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('categories.descriptionPlaceholder')}
              rows={2}
            />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!formData.name || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {categoryData ? t('settings.saveChanges') : t('categories.addCategory')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
