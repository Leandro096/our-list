'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Check, Loader2, UserPlus, ArrowLeft, ChevronsUpDown } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';

import { createClient } from '@/lib/supabase/client';

import type { Guest, Category } from '@/lib';
import type { GuestForEdit } from '@/services';
import {
  createGuestAction,
  updateGuestAction,
  linkGuestToParentAction,
  unlinkGuestFromParentAction,
} from '@/app/dashboard/guests/actions';

import { useAuth } from '@/components/auth-provider';
import { CategoriesDialog } from '@/components/categories';
import {
  Card,
  Label,
  Input,
  Select,
  Button,
  Popover,
  Command,
  Textarea,
  Checkbox,
  CardTitle,
  SelectItem,
  CardHeader,
  CardContent,
  SelectValue,
  CommandList,
  CommandItem,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  SelectContent,
  SelectTrigger,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui';

import { useTranslation } from '@/locales/i18n-provider';

type PendingChild = {
  tempId: string;
  type: 'new' | 'existing';
  first_name: string;
  last_name: string;
  is_plus_one: boolean;
  existing_guest_id?: string;
};

interface GuestFormProps {
  categories: Category[];
  guest?: GuestForEdit;
  mode?: 'create' | 'edit';
}

export function GuestForm({ categories, guest, mode = 'create' }: GuestFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoriesState, setCategoriesState] = useState(categories);

  // Family management state
  const [showNewChildForm, setShowNewChildForm] = useState(false);
  const [childMode, setChildMode] = useState<'new' | 'existing'>('new');
  const [newChildFirst, setNewChildFirst] = useState('');
  const [newChildLast, setNewChildLast] = useState('');
  const [newChildIsPlusOne, setNewChildIsPlusOne] = useState(false);
  const [relatedComboOpen, setRelatedComboOpen] = useState(false);

  // Si solo hay 1 child existente, se muestra en "Agregar Relacionado"; si hay >1, en "Grupo Familiar"
  const [existingRelatedId, setExistingRelatedId] = useState<string | null>(
    guest?.children?.length === 1 ? guest.children[0].id : null
  );

  // Multi-select: IDs de invitados que forman parte del grupo (el invitado actual es el padre)
  // Solo se inicializa con hijos cuando hay más de 1
  const [familyMemberIds, setFamilyMemberIds] = useState<string[]>(
    (guest?.children?.length ?? 0) > 1 ? (guest?.children?.map((c) => c.id) ?? []) : []
  );
  const [familyComboOpen, setFamilyComboOpen] = useState(false);

  // Lazy-loaded available guests para el combobox familiar
  const [availableGuests, setAvailableGuests] = useState<
    Array<{ id: string; first_name: string; last_name: string }>
  >([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [guestsFetched, setGuestsFetched] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchAvailableGuests = async () => {
    if (guestsFetched || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingGuests(true);
    try {
      const client = createClient();
      let query = client
        .from('guests')
        .select('id, first_name, last_name')
        .is('parent_guest_id', null)
        .order('first_name');
      if (guest?.id) {
        query = query.neq('id', guest.id);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setAvailableGuests(data ?? []);
      setGuestsFetched(true);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast({
        title: t('common.error'),
        description: 'No se pudieron cargar los invitados. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoadingGuests(false);
    }
  };

  const handleFamilyComboOpen = async (open: boolean) => {
    setFamilyComboOpen(open);
    if (open) await fetchAvailableGuests();
  };

  const getMemberName = (id: string): string => {
    const existing = guest?.children?.find((c) => c.id === id);
    if (existing) return `${existing.first_name} ${existing.last_name}`;
    const avail = availableGuests.find((g) => g.id === id);
    if (avail) return `${avail.first_name} ${avail.last_name}`;
    return id;
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleSaved = (saved: Category, isNew: boolean) => {
    setCategoriesState((prev) =>
      isNew
        ? [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
        : prev.map((c) => (c.id === saved.id ? saved : c))
    );
  };

  const [formData, setFormData] = useState({
    first_name: guest?.first_name || '',
    last_name: guest?.last_name || '',
    email: guest?.email || '',
    phone: guest?.phone || '',
    status: guest?.status || 'pending',
    dietary_restrictions: guest?.dietary_restrictions || '',
    notes: guest?.notes || '',
    is_plus_one: guest?.is_plus_one || false,
    selectedCategories: guest?.guest_categories?.map((gc) => gc.category_id) || [],
    ceremony_attending:
      guest?.event_attendance?.find((ea) => ea.event_type === 'ceremony')?.attending ?? false,
    reception_attending:
      guest?.event_attendance?.find((ea) => ea.event_type === 'reception')?.attending ?? false,
    pendingChildren: [] as PendingChild[],
    parent_guest_id: guest?.parent_guest_id || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'create') {
        const createdGuest = await createGuestAction({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status as Guest['status'],
          dietary_restrictions: formData.dietary_restrictions,
          notes: formData.notes,
          is_plus_one: formData.is_plus_one,
          selectedCategories: formData.selectedCategories,
          ceremony_attending: formData.ceremony_attending,
          reception_attending: formData.reception_attending,
          created_by: user?.id ?? null,
        });

        // Vincular invitados seleccionados como miembros del grupo
        for (const memberId of familyMemberIds) {
          await linkGuestToParentAction(memberId, createdGuest.id);
        }

        // Crear el nuevo relacionado (plus one)
        for (const child of formData.pendingChildren) {
          if (child.type === 'new') {
            await createGuestAction({
              first_name: child.first_name,
              last_name: child.last_name,
              email: '',
              phone: '',
              status: 'pending',
              dietary_restrictions: '',
              notes: '',
              is_plus_one: child.is_plus_one,
              selectedCategories: [],
              ceremony_attending: formData.ceremony_attending,
              reception_attending: formData.reception_attending,
              parent_guest_id: createdGuest.id,
              created_by: user?.id ?? null,
            });
          } else if (child.existing_guest_id) {
            await linkGuestToParentAction(child.existing_guest_id, createdGuest.id);
          }
        }

        router.push('/dashboard/guests');
        router.refresh();
      } else {
        await updateGuestAction(guest!.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status as Guest['status'],
          dietary_restrictions: formData.dietary_restrictions,
          notes: formData.notes,
          is_plus_one: formData.is_plus_one,
          selectedCategories: formData.selectedCategories,
          ceremony_attending: formData.ceremony_attending,
          reception_attending: formData.reception_attending,
        });

        // Sincronizar el child relacionado único (si aplica)
        const originalRelatedId =
          (guest?.children?.length ?? 0) === 1 ? guest!.children[0].id : null;
        if (originalRelatedId && !existingRelatedId) {
          await unlinkGuestFromParentAction(originalRelatedId);
        }

        // Sincronizar miembros del grupo familiar (>1 hijos)
        const originalChildIds =
          (guest?.children?.length ?? 0) > 1 ? (guest?.children?.map((c) => c.id) ?? []) : [];
        for (const id of originalChildIds) {
          if (!familyMemberIds.includes(id)) {
            await unlinkGuestFromParentAction(id);
          }
        }
        for (const id of familyMemberIds) {
          if (!originalChildIds.includes(id)) {
            await linkGuestToParentAction(id, guest!.id);
          }
        }

        // Crear el nuevo relacionado (plus one)
        for (const child of formData.pendingChildren) {
          if (child.type === 'new') {
            await createGuestAction({
              first_name: child.first_name,
              last_name: child.last_name,
              email: '',
              phone: '',
              status: 'pending',
              dietary_restrictions: '',
              notes: '',
              is_plus_one: child.is_plus_one,
              selectedCategories: [],
              ceremony_attending: formData.ceremony_attending,
              reception_attending: formData.reception_attending,
              parent_guest_id: guest!.id,
              created_by: user?.id ?? null,
            });
          } else if (child.existing_guest_id) {
            await linkGuestToParentAction(child.existing_guest_id, guest!.id);
          }
        }

        router.push(`/dashboard/guests/${guest!.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error('[GuestForm] caught error:', err);
      toast({
        title: t('common.error'),
        description: t('guests.saveError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter((id) => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }));
  };

  const addPendingChild = () => {
    if (formData.pendingChildren.length >= 1) return;
    if (childMode === 'new') {
      if (!newChildFirst.trim() || !newChildLast.trim()) return;
      setFormData((prev) => ({
        ...prev,
        pendingChildren: [
          {
            tempId: crypto.randomUUID(),
            type: 'new' as const,
            first_name: newChildFirst.trim(),
            last_name: newChildLast.trim(),
            is_plus_one: newChildIsPlusOne,
          },
        ],
      }));
      setNewChildFirst('');
      setNewChildLast('');
      setNewChildIsPlusOne(false);
    }
    setShowNewChildForm(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/dashboard/guests">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('guests.backToGuests')}
        </Link>
      </Button>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('guests.firstName')} *</Label>
              <Input
                id="first_name"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t('guests.lastName')} *</Label>
              <Input
                id="last_name"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">{t('guests.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('guests.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RSVP Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.rsvpStatus')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">{t('guests.status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as Guest['status'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('guests.statuses.pending')}</SelectItem>
                <SelectItem value="confirmed">{t('guests.statuses.confirmed')}</SelectItem>
                <SelectItem value="declined">{t('guests.statuses.declined')}</SelectItem>
                <SelectItem value="tentative">{t('guests.statuses.tentative')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {guest?.parent_guest_id == null && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_plus_one"
                checked={formData.is_plus_one}
                onCheckedChange={(checked) => setFormData({ ...formData, is_plus_one: !!checked })}
              />
              <Label htmlFor="is_plus_one" className="font-normal">
                {t('guests.isPlusOne')}
              </Label>
            </div>
          )}

          {/* Agregar relacionado nuevo o existente (máx. 1) */}
          {formData.is_plus_one && (
            <div className="space-y-3">
              <div>
                <Label>{t('guests.addRelated')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('guests.relationPlusOne')}
                </p>
              </div>

              {/* Child existente (solo cuando hay exactamente 1) */}
              {existingRelatedId && (
                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <span className="text-sm">{getMemberName(existingRelatedId)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setExistingRelatedId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Relacionado pendiente */}
              {formData.pendingChildren.map((child) => (
                <div
                  key={child.tempId}
                  className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2"
                >
                  <span className="text-sm">
                    {child.type === 'new' ? (
                      <>
                        {child.first_name} {child.last_name}
                        {child.is_plus_one && (
                          <span className="ml-1 text-xs text-muted-foreground">+1</span>
                        )}
                      </>
                    ) : (
                      (() => {
                        const g = availableGuests.find((ag) => ag.id === child.existing_guest_id);
                        return g ? `${g.first_name} ${g.last_name}` : t('guests.existingGuest');
                      })()
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        pendingChildren: prev.pendingChildren.filter(
                          (c) => c.tempId !== child.tempId
                        ),
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Formulario para nuevo o existente */}
              {showNewChildForm ? (
                <div className="rounded-md border p-3 space-y-3">
                  {/* Tabs nuevo / existente */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={childMode === 'new' ? 'default' : 'outline'}
                      onClick={() => setChildMode('new')}
                    >
                      {t('guests.newRelatedGuest')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={childMode === 'existing' ? 'default' : 'outline'}
                      onClick={async () => {
                        setChildMode('existing');
                        await fetchAvailableGuests();
                      }}
                    >
                      {t('guests.linkExisting')}
                    </Button>
                  </div>

                  {childMode === 'new' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="new_child_first">{t('guests.firstName')}</Label>
                        <Input
                          id="new_child_first"
                          value={newChildFirst}
                          onChange={(e) => setNewChildFirst(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new_child_last">{t('guests.lastName')}</Label>
                        <Input
                          id="new_child_last"
                          value={newChildLast}
                          onChange={(e) => setNewChildLast(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <Popover open={relatedComboOpen} onOpenChange={setRelatedComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {formData.pendingChildren[0]?.existing_guest_id
                            ? (() => {
                                const g = availableGuests.find(
                                  (ag) => ag.id === formData.pendingChildren[0]?.existing_guest_id
                                );
                                return g
                                  ? `${g.first_name} ${g.last_name}`
                                  : t('guests.selectExistingGuest');
                              })()
                            : t('guests.selectExistingGuest')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('guests.search') ?? 'Buscar invitado…'} />
                          <CommandList>
                            {isLoadingGuests ? (
                              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('common.loading')}
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>
                                  {t('guests.noResults') ?? 'Sin resultados.'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {availableGuests
                                    .filter((g) => !familyMemberIds.includes(g.id))
                                    .map((g) => (
                                      <CommandItem
                                        key={g.id}
                                        value={`${g.first_name} ${g.last_name}`}
                                        onSelect={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            pendingChildren: [
                                              {
                                                tempId: crypto.randomUUID(),
                                                type: 'existing' as const,
                                                first_name: g.first_name,
                                                last_name: g.last_name,
                                                is_plus_one: false,
                                                existing_guest_id: g.id,
                                              },
                                            ],
                                          }));
                                          setRelatedComboOpen(false);
                                          setShowNewChildForm(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            formData.pendingChildren[0]?.existing_guest_id === g.id
                                              ? 'opacity-100'
                                              : 'opacity-0'
                                          }`}
                                        />
                                        {g.first_name} {g.last_name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}

                  {childMode === 'new' && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={addPendingChild}
                        disabled={!newChildFirst.trim() || !newChildLast.trim()}
                      >
                        {t('common.confirm')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewChildForm(false);
                          setNewChildFirst('');
                          setNewChildLast('');
                          setNewChildIsPlusOne(false);
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  )}
                  {childMode === 'existing' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewChildForm(false);
                        setChildMode('new');
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  )}
                </div>
              ) : (
                !existingRelatedId &&
                formData.pendingChildren.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewChildForm(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('guests.addRelated')}
                  </Button>
                )
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label>{t('guests.events')}</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ceremony"
                  checked={formData.ceremony_attending}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      ceremony_attending: !!checked,
                    })
                  }
                />
                <Label htmlFor="ceremony" className="font-normal">
                  {t('scanner.ceremony')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reception"
                  checked={formData.reception_attending}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      reception_attending: !!checked,
                    })
                  }
                />
                <Label htmlFor="reception" className="font-normal">
                  {t('scanner.reception')}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t('nav.categories')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categoriesState.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.selectedCategories.includes(category.id)
                    ? 'text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                style={{
                  backgroundColor: formData.selectedCategories.includes(category.id)
                    ? category.color
                    : undefined,
                }}
              >
                {category.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleOpenDialog()}
              className="rounded-full p-2.5 transition-colors hover:bg-primary/10 flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>

            <CategoriesDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              onSave={handleSaved}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grupo Familiar */}
      {guest?.parent_guest_id == null && (
        <Card>
          <CardHeader>
            <CardTitle>{t('guests.family')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sección 1: Miembros del grupo (multi-select de existentes) */}
            <div className="space-y-3">
              <div>
                <Label>{t('guests.partOfGroup')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('guests.addFamilyMember')}
                </p>
              </div>

              {/* Badges de miembros seleccionados */}
              {familyMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {familyMemberIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                    >
                      {getMemberName(id)}
                      <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                        onClick={() =>
                          setFamilyMemberIds((prev) => prev.filter((mid) => mid !== id))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Combobox con búsqueda para agregar miembros */}
              <Popover open={familyComboOpen} onOpenChange={handleFamilyComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={familyComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <UserPlus className="h-4 w-4" />
                      {t('guests.addFamilyMember')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('guests.search') ?? 'Buscar invitado…'} />
                    <CommandList>
                      {isLoadingGuests ? (
                        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>{t('guests.noResults') ?? 'Sin resultados.'}</CommandEmpty>
                          <CommandGroup>
                            {availableGuests
                              .filter((g) => !familyMemberIds.includes(g.id))
                              .map((g) => (
                                <CommandItem
                                  key={g.id}
                                  value={`${g.first_name} ${g.last_name}`}
                                  onSelect={() => {
                                    setFamilyMemberIds((prev) => [...prev, g.id]);
                                    setFamilyComboOpen(false);
                                  }}
                                >
                                  <Check className="mr-2 h-4 w-4 opacity-0" />
                                  {g.first_name} {g.last_name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.additionalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dietary_restrictions">{t('guests.dietaryRestrictions')}</Label>
            <Input
              id="dietary_restrictions"
              value={formData.dietary_restrictions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dietary_restrictions: e.target.value,
                })
              }
              placeholder={t('guests.dietaryPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t('guests.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('guests.notesPlaceholder')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? t('guests.addGuest') : t('settings.saveChanges')}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/guests">{t('common.cancel')}</Link>
        </Button>
      </div>
    </form>
  );
}
