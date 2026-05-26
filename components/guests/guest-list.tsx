'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  QrCode,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Link2,
} from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Category } from '@/lib';
import type { GuestListItem, GuestListItemWithFamily } from '@/services';
import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';
import { deleteGuestAction, bulkDeleteGuestsAction } from '@/app/dashboard/guests/actions';
import { useTranslation } from '@/locales/i18n-provider';
import { toast } from '@/hooks';

// ---- Types ----

export interface GuestFilters {
  q: string;
  status: string;
  categoryIds: string[];
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

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'outline',
  confirmed: 'default',
  declined: 'secondary',
  tentative: 'outline',
};

// ---- Component ----

export function GuestList({ guests, categories, totalCount, currentParams }: GuestListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Local search state with debounce
  const [searchInput, setSearchInput] = useState(currentParams.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Export/import
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Sync search input on external navigation (back/forward)
  useEffect(() => {
    setSearchInput(currentParams.q);
  }, [currentParams.q]);

  // Clear selection when data changes (page change, filter, etc.)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [guests]);

  // ---- Navigation helpers ----

  function navigate(updates: Partial<GuestFilters>) {
    const next = { ...currentParams, ...updates };
    const qs = new URLSearchParams();
    if (next.q) qs.set('q', next.q);
    if (next.status && next.status !== 'all') qs.set('status', next.status);
    if (next.categoryIds.length > 0) qs.set('category', next.categoryIds.join(','));
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
    setSearchInput(value);
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
    setSelectedIds(allSelected ? new Set() : new Set(guests.map((g) => g.id)));
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
      setDeleteTargetId(null);
    });
  }

  function handleBulkDelete() {
    startDeleteTransition(async () => {
      const result = await bulkDeleteGuestsAction([...selectedIds]);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    });
  }

  // ---- Pagination ----

  const totalPages = Math.max(1, Math.ceil(totalCount / currentParams.size));

  function SortIcon({ column }: { column: string }) {
    if (currentParams.sort !== column)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return currentParams.order === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

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

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Dialogs */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        guests={guests}
        categories={categories}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => router.refresh()}
      />

      {/* Single delete confirm */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
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
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
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

      {/* ---- Toolbar ---- */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + import/export */}
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
          <Button variant="outline" size="sm" className="h-8" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.import')}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
        </div>

        {/* Row 2: filters + sort + page size */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {/* Status filter */}
          <Select
            value={currentParams.status}
            onValueChange={(v) => navigate({ status: v, page: 1 })}
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
            onClick={() => setBulkDeleteOpen(true)}
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
                  className="flex items-center text-left text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => handleSort('first_name')}
                >
                  {t('guests.fullName')} <SortIcon column="first_name" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center text-left text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => handleSort('status')}
                >
                  {t('guests.status')} <SortIcon column="status" />
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
                          <Users
                            className="inline h-3.5 w-3.5 mr-1 shrink-0 text-primary"
                          />
                        </span>
                      )}
                      {guest.parent_guest_id && (
                        <span title={t('guests.isChild')}>
                          <Link2
                            className="inline h-3.5 w-3.5 mr-1 shrink-0 text-muted-foreground"
                          />
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
                          onClick={() => setDeleteTargetId(guest.id)}
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
