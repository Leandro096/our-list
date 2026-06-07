'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

import type { Category } from '@/lib/types';
import {
  GUEST_COLUMNS,
  exportGuestsToExcel,
  DEFAULT_EXPORT_COLUMNS,
  REQUIRED_EXPORT_COLUMNS,
} from '@/lib/excel';

import type { GuestListItem } from '@/services/guest.service';

import { useI18n } from '@/locales';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: GuestListItem[];
  categories: Category[];
}

const GROUP_TRANSLATION_KEY: Record<string, string> = {
  basic: 'guests.exportDialog.groupBasic',
  attendance: 'guests.exportDialog.groupAttendance',
  logistics: 'guests.exportDialog.groupLogistics',
};

export function ExportDialog({ open, onOpenChange, guests, categories }: ExportDialogProps) {
  const { t } = useI18n();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_EXPORT_COLUMNS);

  function toggleKey(key: string) {
    if (REQUIRED_EXPORT_COLUMNS.includes(key)) return; // cannot deselect required
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleExport() {
    // Preserve column order from GUEST_COLUMNS
    const ordered = GUEST_COLUMNS.flatMap((c) => (selectedKeys.includes(c.key) ? [c.key] : []));
    exportGuestsToExcel(guests, ordered, categories);
    onOpenChange(false);
  }

  const groups = Array.from(new Set(GUEST_COLUMNS.map((c) => c.group)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('guests.exportDialog.title')}</DialogTitle>
          <DialogDescription>{t('guests.exportDialog.description')}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t('guests.exportDialog.exportingCount', { count: guests.length })}
        </p>

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(GROUP_TRANSLATION_KEY[group] ?? group)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GUEST_COLUMNS.flatMap((col) => {
                  if (col.group !== group) return [];
                  const isRequired = REQUIRED_EXPORT_COLUMNS.includes(col.key);
                  const checked = selectedKeys.includes(col.key);
                  return [
                    <div key={col.key} className="flex items-start gap-2">
                      <Checkbox
                        id={`export-col-${col.key}`}
                        checked={checked}
                        disabled={isRequired}
                        onCheckedChange={() => toggleKey(col.key)}
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor={`export-col-${col.key}`}
                          className="cursor-pointer text-sm leading-none"
                        >
                          {col.label}
                          {isRequired && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({t('guests.exportDialog.colRequired')})
                            </span>
                          )}
                        </Label>
                        {col.hint && <p className="text-xs text-muted-foreground">{col.hint}</p>}
                      </div>
                    </div>,
                  ];
                })}
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('guests.exportDialog.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={selectedKeys.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {t('guests.exportDialog.downloadExcel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
