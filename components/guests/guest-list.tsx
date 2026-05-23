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
} from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { GuestListItem } from '@/services';
import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';
import { deleteGuestAction, bulkDeleteGuestsAction } from '@/app/dashboard/guests/actions';

// ---- Types ----

export interface GuestFilters {
  q: string;
  status: string;
  category: string;
  sort: string;
  order: string;
  page: number;
  size: number;
}

interface GuestListProps {
  guests: GuestListItem[];
  categories: Category[];
  totalCount: number;
  currentParams: GuestFilters;
}

// ---- Constants ----

const PAGE_SIZES = [50, 100, 300];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
  { value: 'tentative', label: 'Tentative' },
];

const SORT_OPTIONS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'status', label: 'Status' },
  { value: 'created_at', label: 'Date Added' },
];

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
    if (next.category && next.category !== 'all') qs.set('category', next.category);
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
      await deleteGuestAction(deleteTargetId);
      setDeleteTargetId(null);
    });
  }

  function handleBulkDelete() {
    startDeleteTransition(async () => {
      await bulkDeleteGuestsAction([...selectedIds]);
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
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this guest? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} guests</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} guest
              {selectedIds.size !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
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
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Row 2: filters + sort + page size */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={currentParams.status}
            onValueChange={(v) => navigate({ status: v, page: 1 })}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentParams.category}
            onValueChange={(v) => navigate({ category: v, page: 1 })}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentParams.sort}
            onValueChange={(v) => navigate({ sort: v, order: 'asc', page: 1 })}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() =>
              navigate({ order: currentParams.order === 'asc' ? 'desc' : 'asc' })
            }
          >
            {currentParams.order === 'asc' ? (
              <><ArrowUp className="mr-1 h-3 w-3" /> Asc</>
            ) : (
              <><ArrowDown className="mr-1 h-3 w-3" /> Desc</>
            )}
          </Button>

          <Select
            value={String(currentParams.size)}
            onValueChange={(v) => navigate({ size: parseInt(v), page: 1 })}
          >
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">
                  {s} / page
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
            {selectedIds.size} guest{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete selected
          </Button>
        </div>
      )}

      {/* ---- Count ---- */}
      <p className="text-sm text-muted-foreground">
        {totalCount === 0
          ? 'No guests found'
          : `Showing ${(currentParams.page - 1) * currentParams.size + 1}–${Math.min(currentParams.page * currentParams.size, totalCount)} of ${totalCount} guests`}
      </p>

      {/* ---- Table ---- */}
      <div className="overflow-hidden rounded-lg border border-border">
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
                  ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(someSelected); }}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                />
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center text-left text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => handleSort('first_name')}
                >
                  Name <SortIcon column="first_name" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center text-left text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon column="status" />
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">
                Categories
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wide">
                Table
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No guests found
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
                      {guest.first_name} {guest.last_name}
                      {guest.is_plus_one && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          +1
                        </span>
                      )}
                    </p>
                    {guest.email && (
                      <p className="truncate text-xs text-muted-foreground">{guest.email}</p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[guest.status] ?? 'outline'} className="text-xs">
                      {guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
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
                    {guest.seating_assignments?.[0]?.tables?.number ?? '—'}
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/qr`}>
                            <QrCode className="mr-2 h-4 w-4" /> QR Code
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTargetId(guest.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            Page {currentParams.page} of {totalPages}
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
                ),
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
