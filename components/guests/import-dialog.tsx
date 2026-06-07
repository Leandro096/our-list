'use client';

import { useRef, useReducer, useCallback } from 'react';
import {
  Upload,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

import { validateImportRows } from '@/lib/validations/guest-import';
import {
  GUEST_COLUMNS,
  parseExcelFile,
  detectColumnKey,
  downloadGuestTemplate,
  REQUIRED_EXPORT_COLUMNS,
} from '@/lib/excel';

import { useI18n } from '@/locales';
import { importGuestsAction } from '@/app/dashboard/guests/actions';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';

type Step = 'upload' | 'map' | 'preview' | 'result';

const STEP_PROGRESS: Record<Step, number> = {
  upload: 25,
  map: 50,
  preview: 75,
  result: 100,
};

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const IGNORE_VALUE = '__ignore__';

type State = {
  step: Step;
  isDragging: boolean;
  isLoading: boolean;
  error: string | null;
  detectedHeaders: string[];
  rawRows: Record<string, string>[];
  columnMap: Record<string, string>;
  validCount: number;
  errorRows: Array<{ row: number; error: string }>;
  importResult: { created: number; errors: Array<{ row: number; error: string }> } | null;
};

type Action = { type: 'UPDATE'; payload: Partial<State> } | { type: 'RESET' };

const initialState: State = {
  step: 'upload',
  isDragging: false,
  isLoading: false,
  error: null,
  detectedHeaders: [],
  rawRows: [],
  columnMap: {},
  validCount: 0,
  errorRows: [],
  importResult: null,
};

function reducer(state: State, action: Action): State {
  if (action.type === 'RESET') return initialState;
  return { ...state, ...action.payload };
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    step,
    isDragging,
    isLoading,
    error,
    detectedHeaders,
    rawRows,
    columnMap,
    validCount,
    errorRows,
    importResult,
  } = state;

  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mappedRowsRef = useRef<Record<string, string>[]>([]);

  function reset() {
    dispatch({ type: 'RESET' });
    mappedRowsRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Step 1: Upload ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      dispatch({ type: 'UPDATE', payload: { error: t('guests.importDialog.errorOnlyFormats') } });
      return;
    }
    dispatch({ type: 'UPDATE', payload: { isLoading: true, error: null } });
    try {
      const { headers, rows } = await parseExcelFile(file);
      if (headers.length === 0 || rows.length === 0) {
        dispatch({ type: 'UPDATE', payload: { error: t('guests.importDialog.errorEmpty') } });
        return;
      }
      const autoMap: Record<string, string> = {};
      headers.forEach((h) => {
        const detected = detectColumnKey(h);
        autoMap[h] = detected ?? IGNORE_VALUE;
      });
      dispatch({
        type: 'UPDATE',
        payload: { detectedHeaders: headers, rawRows: rows, columnMap: autoMap, step: 'map' },
      });
    } catch {
      dispatch({ type: 'UPDATE', payload: { error: t('guests.importDialog.errorReadFail') } });
    } finally {
      dispatch({ type: 'UPDATE', payload: { isLoading: false } });
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dispatch({ type: 'UPDATE', payload: { isDragging: false } });
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Step 2: Map columns ─────────────────────────────────────────────────────

  function applyMapping() {
    const remapped = rawRows.map((row) => {
      const newRow: Record<string, string> = {};
      detectedHeaders.forEach((h) => {
        const key = columnMap[h];
        if (key && key !== IGNORE_VALUE) {
          newRow[key] = row[h] ?? '';
        }
      });
      return newRow;
    });

    const { valid, errors } = validateImportRows(remapped);
    mappedRowsRef.current = remapped;
    dispatch({
      type: 'UPDATE',
      payload: {
        validCount: valid.length,
        errorRows: errors.map((e) => ({ row: e.row, error: e.error ?? 'Validation error' })),
        step: 'preview',
      },
    });
  }

  // ── Step 4: Import ──────────────────────────────────────────────────────────

  async function handleImport() {
    dispatch({ type: 'UPDATE', payload: { isLoading: true, error: null } });
    try {
      const result = await importGuestsAction(mappedRowsRef.current);
      dispatch({ type: 'UPDATE', payload: { importResult: result, step: 'result' } });
      if (result.created > 0) onImported?.();
    } catch (e) {
      dispatch({
        type: 'UPDATE',
        payload: { error: e instanceof Error ? e.message : t('guests.importDialog.importFailed') },
      });
    } finally {
      dispatch({ type: 'UPDATE', payload: { isLoading: false } });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('guests.importDialog.title')}</DialogTitle>
          <DialogDescription>{t('guests.importDialog.description')}</DialogDescription>
        </DialogHeader>

        <Progress value={STEP_PROGRESS[step]} className="h-1" />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ─── Step 1: Upload ─── */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Column reference */}
            <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('guests.importDialog.templateTitle')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GUEST_COLUMNS.map((col) => {
                  const isRequired = REQUIRED_EXPORT_COLUMNS.includes(col.key);
                  return (
                    <span
                      key={col.key}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                        isRequired
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                          : 'bg-muted text-muted-foreground ring-1 ring-border'
                      }`}
                    >
                      {col.label}
                      {isRequired && <span className="font-bold text-destructive">*</span>}
                      {col.hint && <span className="opacity-60"> — {col.hint}</span>}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('guests.importDialog.templateHint')}
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                dispatch({ type: 'UPDATE', payload: { isDragging: true } });
              }}
              onDragLeave={() => dispatch({ type: 'UPDATE', payload: { isDragging: false } })}
              onDrop={onDrop}
            >
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t('guests.importDialog.dragDropHere')}</p>
                <p className="text-sm text-muted-foreground">{t('guests.importDialog.supports')}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadGuestTemplate()}>
                  {t('guests.importDialog.downloadTemplate')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isLoading
                    ? t('guests.importDialog.readingFile')
                    : t('guests.importDialog.chooseFile')}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                aria-label="Upload guest list file"
                className="hidden"
                onChange={onFileInput}
              />
            </div>
          </div>
        )}

        {/* ─── Step 2: Map columns ─── */}
        {step === 'map' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('guests.importDialog.mapDescription', {
                cols: detectedHeaders.length,
                rows: rawRows.length,
              })}
            </p>
            <ScrollArea className="h-64 rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('guests.importDialog.colFile')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('guests.importDialog.colMapsTo')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('guests.importDialog.colPreview')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detectedHeaders.map((header) => (
                    <tr key={header} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{header}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={columnMap[header] ?? IGNORE_VALUE}
                          onValueChange={(val) =>
                            dispatch({
                              type: 'UPDATE',
                              payload: { columnMap: { ...columnMap, [header]: val } },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={IGNORE_VALUE}>
                              <span className="text-muted-foreground">
                                {t('guests.importDialog.ignore')}
                              </span>
                            </SelectItem>
                            {GUEST_COLUMNS.map((col) => (
                              <SelectItem key={col.key} value={col.key}>
                                {col.label}
                                {col.required && <span className="ml-1 text-destructive">*</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {rawRows[0]?.[header] ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {t('guests.importDialog.firstLastRequired')}
            </p>
          </div>
        )}

        {/* ─── Step 3: Preview ─── */}
        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-md border bg-green-50 px-3 py-2 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {t('guests.importDialog.validRows', { count: validCount })}
                </span>
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-2 rounded-md border bg-red-50 px-3 py-2 dark:bg-red-950">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    {t('guests.importDialog.errorRows', {
                      count: errorRows.length,
                    })}
                  </span>
                </div>
              )}
            </div>

            {errorRows.length > 0 && (
              <ScrollArea className="h-40 rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-1.5 text-left">{t('guests.importDialog.rowCol')}</th>
                      <th className="px-3 py-1.5 text-left">{t('guests.importDialog.errorCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorRows.map((e) => (
                      <tr key={e.row} className="border-t">
                        <td className="px-3 py-1.5 font-mono">{e.row}</td>
                        <td className="px-3 py-1.5 text-destructive">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}

            {validCount === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t('guests.importDialog.noValidRows')}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* ─── Step 4: Result ─── */}
        {step === 'result' && importResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-md border bg-green-50 px-4 py-3 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {t('guests.importDialog.importedOk', {
                    count: importResult.created,
                  })}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t('guests.importDialog.failedRows', {
                    count: importResult.errors.length,
                  })}
                </p>
                <ScrollArea className="h-40 rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-1.5 text-left">{t('guests.importDialog.rowCol')}</th>
                        <th className="px-3 py-1.5 text-left">
                          {t('guests.importDialog.errorCol')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((e) => (
                        <tr key={e.row} className="border-t">
                          <td className="px-3 py-1.5 font-mono">{e.row}</td>
                          <td className="px-3 py-1.5 text-destructive">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* ─── Footer ─── */}
        <DialogFooter className="gap-2">
          {step !== 'upload' && step !== 'result' && (
            <Button
              variant="outline"
              onClick={() =>
                dispatch({ type: 'UPDATE', payload: { step: step === 'map' ? 'upload' : 'map' } })
              }
              disabled={isLoading}
            >
              {t('guests.importDialog.back')}
            </Button>
          )}

          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('guests.importDialog.cancel')}
            </Button>
          )}

          {step === 'map' && (
            <Button onClick={applyMapping}>
              {t('guests.importDialog.previewBtn')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('guests.importDialog.startOver')}
              </Button>
              <Button onClick={handleImport} disabled={isLoading || validCount === 0}>
                {isLoading
                  ? t('guests.importDialog.importingBtn')
                  : t('guests.importDialog.importBtn', { count: validCount })}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              {t('guests.importDialog.done')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
