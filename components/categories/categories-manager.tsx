'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, deleteCategory } from '@/services'
import type { CategoryWithCount } from '@/services'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useTranslation } from '@/locales/i18n-provider'

interface CategoriesManagerProps {
  categories: CategoryWithCount[]
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
]

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  const { t } = useTranslation()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#C9A84C',
    description: '',
  })

  const handleOpenDialog = (category?: CategoryWithCount) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        color: category.color,
        description: category.description || '',
      })
    } else {
      setEditingCategory(null)
      setFormData({ name: '', color: '#C9A84C', description: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingCategory) {
        await updateCategory(supabase, editingCategory.id, formData)
      } else {
        await createCategory(supabase, formData)
      }

      setIsDialogOpen(false)
      router.refresh()
      toast({ title: t('categories.categorySaved') })
    } catch (error) {
      console.error('Error saving category:', error)
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      await deleteCategory(supabase, id)
      router.refresh()
      toast({ title: t('categories.categoryDeleted') })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Category Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription className="sr-only">Fill in the details to save the category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Family - Bride"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
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
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!formData.name}>
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tags className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No categories yet</p>
            <p className="text-sm text-muted-foreground">
              Create categories to organize your guests
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
                    <CardTitle className="font-serif text-lg">{category.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{category.guestCount} guests</Badge>
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
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
