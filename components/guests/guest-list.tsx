'use client';

import { useState, useMemo, useTransition } from 'react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Badge } from '@/components/ui';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  QrCode,
  Download,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib';
import type { GuestListItem } from '@/services';
import { ExportDialog } from './export-dialog';
import { ImportDialog } from './import-dialog';
import { deleteGuestAction } from '@/app/dashboard/guests/actions';

interface GuestListProps {
  guests: GuestListItem[];
  categories: Category[];
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'outline' as const },
  confirmed: { label: 'Confirmed', variant: 'default' as const },
  declined: { label: 'Declined', variant: 'secondary' as const },
  tentative: { label: 'Tentative', variant: 'outline' as const },
};

const PAGE_SIZE = 15;

export function GuestList({ guests, categories }: GuestListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        search === '' ||
        guest.first_name.toLowerCase().includes(searchLower) ||
        guest.last_name.toLowerCase().includes(searchLower) ||
        guest.email?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || guest.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' ||
        guest.guest_categories.some((gc) => gc.category_id === categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [guests, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedGuests = filteredGuests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleFilterChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      await deleteGuestAction(deleteTargetId);
      setDeleteTargetId(null);
    });
  }

  return (
    <div className="space-y-4">
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        guests={filteredGuests}
        categories={categories}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => router.refresh()}
      />

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this guest? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters + actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="tentative">Tentative</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={handleFilterChange(setCategoryFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * PAGE_SIZE + 1}–
        {Math.min(currentPage * PAGE_SIZE, filteredGuests.length)} of {filteredGuests.length} guests
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Categories</TableHead>
              <TableHead className="hidden lg:table-cell">Table</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No guests found
                </TableCell>
              </TableRow>
            ) : (
              pagedGuests.map((guest) => (
                <TableRow
                  key={guest.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/guests/${guest.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {guest.first_name} {guest.last_name}
                      </p>
                      {guest.is_plus_one && (
                        <span className="text-xs text-muted-foreground">Plus One</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{guest.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[guest.status].variant}>
                      {statusConfig[guest.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {guest.guest_categories.slice(0, 2).map((gc) => (
                        <Badge
                          key={gc.category_id}
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: gc.categories.color,
                            color: gc.categories.color,
                          }}
                        >
                          {gc.categories.name}
                        </Badge>
                      ))}
                      {guest.guest_categories.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{guest.guest_categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {guest.seating_assignments?.[0]?.tables?.number || '-'}
                  </TableCell>
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
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/guests/${guest.id}/qr`}>
                            <QrCode className="mr-2 h-4 w-4" />
                            QR Code
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTargetId(guest.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(p);
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
