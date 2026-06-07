'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useEffect, useReducer, useTransition } from 'react';
import {
  X,
  Eye,
  Users,
  Link2,
  Filter,
  Search,
  Pencil,
  Trash2,
  QrCode,
  Upload,
  ArrowUp,
  Download,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';

import { toast } from '@/hooks';
import type { Category } from '@/lib';
import type { GuestListItemWithFamily } from '@/services';
import { deleteGuestAction, bulkDeleteGuestsAction } from '@/app/dashboard/guests/actions';

import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTitle, DialogHeader, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  Input,
  Badge,
  Table,
  Button,
  Select,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  SelectItem,
  SelectValue,
  TableHeader,
  DropdownMenu,
  SelectContent,
  SelectTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui';

import { useTranslation } from '@/locales/i18n-provider';

import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';

// ---- Types ----

export interface GuestFilters {
  q: string;
  status: string;
  categoryIds: string[];
  eventTypes: string[];
  sort: string;
  order: string;
  page: number;
  size: number;
}

interface GuestListProps {
  guests: GuestListItemWithFamily[];
  categories: Category[];
  totalCount: number;
  currentParams: GuestFilters;
}

// ---- Constants ----

const PAGE_SIZES = [50, 100, 300];

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'declined', 'tentative'] as const;

const SORT_OPTIONS = ['first_name', 'last_name', 'status', 'created_at'] as const;

const EVENT_TYPE_OPTIONS = ['all', 'ceremony', 'reception', 'both', 'none'] as const;
type EventTypeOption = (typeof EVENT_TYPE_OPTIONS)[number];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'outline',
  confirmed: 'default',
  declined: 'secondary',
  tentative: 'outline',
};

// ---- Module-scope helpers ----

function SortIcon({ column, sort, order }: { column: string; sort: string; order: string }) {
  if (sort !== column) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return order === 'asc' ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

// ---- Component ----

type GuestListState = {
  searchInput: string;
  selectedIds: Set<string>;
  deleteTargetId: string | null;
  bulkDeleteOpen: boolean;
  exportOpen: boolean;
  importOpen: boolean;
  filtersOpen: boolean;
};

type GuestListAction = { type: 'UPDATE'; payload: Partial<GuestListState> };

function guestListReducer(state: GuestListState, action: GuestListAction): GuestListState {
  return { ...state, ...action.payload };
}

export function GuestList({ guests, categories, totalCount, currentParams }: GuestListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const [state, dispatch] = useReducer(guestListReducer, {
    searchInput: currentParams.q,
    selectedIds: new Set<string>(),
    deleteTargetId: null,
    bulkDeleteOpen: false,
    exportOpen: false,
    importOpen: false,
    filtersOpen: false,
  });

  const {
    searchInput,
    selectedIds,
    deleteTargetId,
    bulkDeleteOpen,
    exportOpen,
    importOpen,
    filtersOpen,
  } = state;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync searchInput with URL param when external navigation changes q
  useEffect(() => {
    dispatch({ type: 'UPDATE', payload: { searchInput: currentParams.q } });
  }, [currentParams.q]);

  // Reset selection when the guest list changes
  useEffect(() => {
    dispatch({ type: 'UPDATE', payload: { selectedIds: new Set() } });
  }, [guests]);

  // Cleanup pending debounce timer on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  // ---- Navigation helpers ----

  function navigate(updates: Partial<GuestFilters>) {
    const next = { ...currentParams, ...updates };
    const qs = new URLSearchParams();
    if (next.q) qs.set('q', next.q);
    if (next.status && next.status !== 'all') qs.set('status', next.status);
    if (next.categoryIds.length > 0) qs.set('category', next.categoryIds.join(','));
    if (next.eventTypes.length > 0) qs.set('events', next.eventTypes.join(','));
    if (next.sort !== 'first_name') qs.set('sort', next.sort);
    if (next.order !== 'asc') qs.set('order', next.order);
    if (next.page !== 1) qs.set('page', String(next.page));
    if (next.size !== 50) qs.set('size', String(next.size));
    const search = qs.toString();
    startTransition(() => {
      router.push(`${pathname}${search ? `?${search}` : ''}`);
    });
  }

  function handleSearchChange(value: string) {
    dispatch({ type: 'UPDATE', payload: { searchInput: value } });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value, page: 1 }), 400);
  }

  function handleSort(column: string) {
    if (currentParams.sort === column) {
      navigate({ order: currentParams.order === 'asc' ? 'desc' : 'asc' });
    } else {
      navigate({ sort: column, order: 'asc', page: 1 });
    }
  }

  // ---- Selection helpers ----

  const allSelected = guests.length > 0 && selectedIds.size === guests.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    dispatch({
      type: 'UPDATE',
      payload: { selectedIds: allSelected ? new Set() : new Set(guests.map((g) => g.id)) },
    });
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    next.has(id) ? next.delete(id) : next.add(id);
    dispatch({ type: 'UPDATE', payload: { selectedIds: next } });
  }

  // ---- Delete helpers ----

  function handleDelete() {
    if (!deleteTargetId) return;
    startDeleteTransition(async () => {
      const result = await deleteGuestAction(deleteTargetId);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      dispatch({ type: 'UPDATE', payload: { deleteTargetId: null } });
    });
  }

  function handleBulkDelete() {
    startDeleteTransition(async () => {
      const result = await bulkDeleteGuestsAction([...selectedIds]);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      dispatch({ type: 'UPDATE', payload: { selectedIds: new Set(), bulkDeleteOpen: false } });
    });
  }

  // ---- Filter helpers ----

  const hasActiveFilters =
    currentParams.q !== '' ||
    currentParams.status !== 'all' ||
    currentParams.categoryIds.length > 0 ||
    currentParams.eventTypes.length > 0;

  function handleResetFilters() {
    dispatch({ type: 'UPDATE', payload: { searchInput: '', filtersOpen: false } });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ q: '', status: 'all', categoryIds: [], eventTypes: [], page: 1 });
  }

  // ---- Pagination ----

  const totalPages = Math.max(1, Math.ceil(totalCount / currentParams.size));

  function getStatusLabel(value: string) {
    if (value === 'all') return t('guests.allStatus');
    return t(`guests.statuses.${value}`);
  }

  function getSortLabel(value: string) {
    if (value === 'first_name') return t('guests.firstName');
    if (value === 'last_name') return t('guests.lastName');
    if (value === 'status') return t('guests.status');
    return t('guests.dateAdded');
  }

  const selectedCategories = categories.filter((cat) => currentParams.categoryIds.includes(cat.id));

  function getCategoryFilterLabel() {
    if (selectedCategories.length === 0) return t('guests.allCategories');
    if (selectedCategories.length === 1) return selectedCategories[0].name;
    return t('guests.categoriesSelected', { count: selectedCategories.length });
  }

  function toggleCategoryFilter(categoryId: string) {
    const nextIds = currentParams.categoryIds.includes(categoryId)
      ? currentParams.categoryIds.filter((id) => id !== categoryId)
      : [...currentParams.categoryIds, categoryId];

    navigate({ categoryIds: nextIds, page: 1 });
  }

  function getEventTypeOption(): EventTypeOption {
    const types = currentParams.eventTypes;
    if (types.length === 0) return 'all';
    if (types.length === 2 && types.includes('ceremony') && types.includes('reception'))
      return 'both';
    if (types.length === 1) return types[0] as EventTypeOption;
    return 'all';
  }

  function handleEventTypeChange(option: EventTypeOption) {
    const map: Record<EventTypeOption, string[]> = {
      all: [],
      ceremony: ['ceremony'],
      reception: ['reception'],
      both: ['ceremony', 'reception'],
      none: ['none'],
    };
    navigate({ eventTypes: map[option], page: 1 });
  }

  // ---- Shared filter controls (used in both desktop row and mobile dialog) ----

  function FilterControls({ onAfterChange }: { onAfterChange?: () => void }) {
    return (
      <>
        {/* Status filter */}
        <Select
          value={currentParams.status}
          onValueChange={(v) => {
            navigate({ status: v, page: 1 });
            onAfterChange?.();
          }}
        >
          <SelectTrigger size="sm" className="w-full text-xs sm:w-[130px]">
            <SelectValue placeholder={t('guests.status')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o} value={o} className="text-xs">
                {getStatusLabel(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs font-normal leading-none sm:w-[190px]"
            >
              <span className="truncate">{getCategoryFilterLabel()}</span>
              <ChevronRight className="h-3 w-3 rotate-90 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[260px]">
            <DropdownMenuCheckboxItem
              checked={currentParams.categoryIds.length === 0}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => navigate({ categoryIds: [], page: 1 })}
              className="text-xs"
            >
              {t('guests.allCategories')}
            </DropdownMenuCheckboxItem>
            {categories.length > 0 && <DropdownMenuSeparator />}
            {categories.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat.id}
                checked={currentParams.categoryIds.includes(cat.id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggleCategoryFilter(cat.id)}
                className="text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Event type filter */}
        <Select
          value={getEventTypeOption()}
          onValueChange={(v) => {
            handleEventTypeChange(v as EventTypeOption);
            onAfterChange?.();
          }}
        >
          <SelectTrigger size="sm" className="w-full text-xs sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {t(`guests.eventTypes.${opt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort filter */}
        <Select
          value={currentParams.sort}
          onValueChange={(v) => navigate({ sort: v, order: 'asc', page: 1 })}
        >
          <SelectTrigger size="sm" className="w-full text-xs sm:w-[130px]">
            <SelectValue placeholder={t('guests.sortBy')} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o} value={o} className="text-xs">
                {getSortLabel(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Order toggle */}
        <Button
          variant="outline"
          size="sm"
          className="w-full px-2 text-xs leading-none sm:w-auto"
          onClick={() => navigate({ order: currentParams.order === 'asc' ? 'desc' : 'asc' })}
        >
          {currentParams.order === 'asc' ? (
            <>
              <ArrowUp className="mr-1 h-3 w-3" /> {t('guests.asc')}
            </>
          ) : (
            <>
              <ArrowDown className="mr-1 h-3 w-3" /> {t('guests.desc')}
            </>
          )}
        </Button>

        {/* Page size filter */}
        <Select
          value={String(currentParams.size)}
          onValueChange={(v) => navigate({ size: parseInt(v), page: 1 })}
        >
          <SelectTrigger size="sm" className="w-full text-xs sm:w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">
                {t('guests.perPage', { count: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Dialogs */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={(v) => dispatch({ type: 'UPDATE', payload: { exportOpen: v } })}
        guests={guests}
        categories={categories}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={(v) => dispatch({ type: 'UPDATE', payload: { importOpen: v } })}
        onImported={() => router.refresh()}
      />

      {/* Single delete confirm */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'UPDATE', payload: { deleteTargetId: null } });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('guests.deleteGuest')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('guests.deleteGuestConfirm')} {t('common.thisActionCannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('guests.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(v) => dispatch({ type: 'UPDATE', payload: { bulkDeleteOpen: v } })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('guests.deleteManyTitle', { count: selectedIds.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('guests.deleteManyDescription', {
                count: selectedIds.size,
                suffix: selectedIds.size !== 1 ? 's' : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting
                ? t('guests.deleting')
                : t('guests.deleteCount', { count: selectedIds.size })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile filters dialog */}
      <Dialog
        open={filtersOpen}
        onOpenChange={(v) => dispatch({ type: 'UPDATE', payload: { filtersOpen: v } })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('guests.filtersTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <FilterControls
              onAfterChange={() => dispatch({ type: 'UPDATE', payload: { filtersOpen: false } })}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={handleResetFilters}
              >
                <X className="mr-1.5 h-3 w-3" />
                {t('guests.resetFilters')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Toolbar ---- */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + mobile filter button + import/export */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('guests.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 pl-9"
            />
          </div>
          {/* Mobile: filters button */}
          <Button
            variant="outline"
            size="sm"
            className="relative h-8 sm:hidden"
            onClick={() => dispatch({ type: 'UPDATE', payload: { filtersOpen: true } })}
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => dispatch({ type: 'UPDATE', payload: { importOpen: true } })}
          >
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.import')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => dispatch({ type: 'UPDATE', payload: { exportOpen: true } })}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
        </div>

        {/* Row 2: filters + sort + page size (desktop only) */}
        <div className="hidden flex-wrap gap-2 sm:flex">
          <FilterControls />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={handleResetFilters}
            >
              <X className="mr-1 h-3 w-3" />
              {t('guests.resetFilters')}
            </Button>
          )}
        </div>
      </div>

      {/* ---- Bulk action bar ---- */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2">
          <span className="text-sm font-medium">
            {t('guests.selectedCount', {
              count: selectedIds.size,
              suffix: selectedIds.size !== 1 ? 's' : '',
            })}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => dispatch({ type: 'UPDATE', payload: { bulkDeleteOpen: true } })}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('guests.deleteSelected')}
          </Button>
        </div>
      )}

      {/* ---- Count ---- */}
      <p className="text-sm text-muted-foreground">
        {totalCount === 0
          ? t('guests.noGuestsFound')
          : t('guests.showingRange', {
              start: (currentParams.page - 1) * currentParams.size + 1,
              end: Math.min(currentParams.page * currentParams.size, totalCount),
              total: totalCount,
            })}
      </p>

      {/* ---- Table ---- */}
      <div className="relative overflow-hidden rounded-lg border border-border">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <Table className="w-full table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="min-w-0 w-auto" />
            <col className="w-28" />
            <col className="hidden w-48 md:table-column" />
            <col className="hidden w-20 lg:table-column" />
            <col className="w-10" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement).dataset.indeterminate = String(someSelected);
                  }}
                  onCheckedChange={toggleAll}
                  aria-label={t('guests.selectAll')}
                  data-state={
                    someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'
                  }
                />
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center text-left text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => handleSort('first_name')}
                >
                  {t('guests.fullName')}{' '}
                  <SortIcon
                    column="first_name"
                    sort={currentParams.sort}
                    order={currentParams.order}
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center text-left text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => handleSort('status')}
                >
                  {t('guests.status')}{' '}
                  <SortIcon column="status" sort={currentParams.sort} order={currentParams.order} />
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">
                {t('nav.categories')}
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wide">
                {t('guests.table')}
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {t('guests.noGuestsFound')}
                </TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <TableRow
                  key={guest.id}
                  className={`cursor-pointer transition-colors ${selectedIds.has(guest.id) ? 'bg-muted/50' : ''}`}
                  onClick={() => router.push(`/dashboard/guests/${guest.id}`)}
                >
                  {/* Checkbox */}
                  <TableCell
                    className="px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(guest.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.has(guest.id)}
                      onCheckedChange={() => toggleRow(guest.id)}
                      aria-label={`Select ${guest.first_name}`}
                    />
                  </TableCell>

                  {/* Name + email stacked */}
                  <TableCell className="min-w-0 py-3">
                    <p className="truncate font-medium leading-tight">
                      {!guest.parent_guest_id && guest.has_children && (
                        <span title={t('guests.isParent')}>
                          <Users className="inline h-3.5 w-3.5 mr-1 shrink-0 text-primary" />
                        </span>
                      )}
                      {guest.parent_guest_id && (
                        <span title={t('guests.isChild')}>
                          <Link2 className="inline h-3.5 w-3.5 mr-1 shrink-0 text-muted-foreground" />
                        </span>
                      )}
                      {guest.first_name} {guest.last_name}
                      {guest.is_plus_one && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">+1</span>
                      )}
                    </p>
                    {guest.email && (
                      <p className="truncate text-xs text-muted-foreground">{guest.email}</p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[guest.status] ?? 'outline'} className="text-xs">
                      {t(`guests.statuses.${guest.status}`)}
                    </Badge>
                  </TableCell>

                  {/* Categories */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {guest.guest_categories.slice(0, 2).map((gc) => (
                        <span
                          key={gc.category_id}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                          style={{
                            borderColor: gc.categories.color,
                            color: gc.categories.color,
                          }}
                        >
                          {gc.categories.name}
                        </span>
                      ))}
                      {guest.guest_categories.length > 2 && (
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          +{guest.guest_categories.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Table # */}
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {guest.seating_assignments?.[0]?.tables?.number ?? t('common.no')}
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t('common.actions')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> {t('common.view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/qr`}>
                            <QrCode className="mr-2 h-4 w-4" /> {t('guests.qrCode')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            dispatch({ type: 'UPDATE', payload: { deleteTargetId: guest.id } })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ---- Pagination ---- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {t('guests.pageOf', { page: currentParams.page, totalPages })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentParams.page <= 1 || isPending}
              onClick={() => navigate({ page: currentParams.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                const cur = currentParams.page;
                return p === 1 || p === totalPages || Math.abs(p - cur) <= 1;
              })
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentParams.page ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    disabled={isPending}
                    onClick={() => navigate({ page: p as number })}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentParams.page >= totalPages || isPending}
              onClick={() => navigate({ page: currentParams.page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
