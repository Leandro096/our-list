'use client';

import { Html5Qrcode } from 'html5-qrcode';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Users, XCircle, ScanLine, CheckCircle, AlertTriangle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { toast } from '@/hooks';
import { useTranslation } from '@/locales';
import {
  getTodayStats,
  type ScannerGuest,
  type GroupScanMember,
  processGuestScanByFamily,
} from '@/services';

import { useAuth } from '@/components/auth-provider';
import {
  Card,
  Badge,
  Button,
  Select,
  CardTitle,
  SelectItem,
  CardHeader,
  SelectValue,
  CardContent,
  SelectContent,
  SelectTrigger,
} from '@/components/ui';

type ScanResult = {
  success: boolean;
  guest?: ScannerGuest;
  members?: GroupScanMember[];
  isDuplicate?: boolean;
  allDuplicate?: boolean;
  message: string;
};

export default function ScannerPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const supabase = useMemo(() => createClient(), []);
  const [eventType, setEventType] = useState<'ceremony' | 'reception'>('ceremony');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [todayStats, setTodayStats] = useState({ ceremony: 0, reception: 0 });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const fetchTodayStats = useCallback(async () => {
    try {
      const stats = await getTodayStats(supabase);
      setTodayStats(stats);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas de hoy.',
        variant: 'destructive',
      });
    }
  }, [supabase]);

  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);

  const handleScan = async (invitationGuid: string) => {
    try {
      const result = await processGuestScanByFamily(
        supabase,
        invitationGuid,
        eventType,
        profile?.id
      );

      if (!result.found) {
        setScanResult({
          success: false,
          message: t('scanner.guestNotFound'),
        });
        return;
      }

      setTodayStats(result.today_stats);

      setScanResult({
        success: true,
        isDuplicate: result.any_duplicate,
        allDuplicate: result.all_duplicate,
        guest: result.group_root,
        members: result.members,
        message: result.all_duplicate
          ? t('scanner.groupAlreadyCheckedIn')
          : t('scanner.groupCheckInSuccess'),
      });
    } catch {
      setScanResult({
        success: false,
        message: t('scanner.checkInError'),
      });
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
        const cameraId = isMobile
          ? { facingMode: { exact: 'environment' } }
          : cameras.length > 0
            ? cameras[0].id
            : { facingMode: 'environment' };

        return scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await scanner.stop().catch(() => {});
            scannerRef.current = null;
            setIsScanning(false);
            await handleScan(decodedText);
          },
          undefined
        );
      })
      .catch(() => {
        scannerRef.current = null;
        setIsScanning(false);
      });

    // eslint-disable-next-line consistent-return
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
          console.warn('[Scanner] Error stopping camera on cleanup:', err);
        });
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  const startScanning = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('scanner.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('scanner.description')}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats.ceremony}</p>
              <p className="text-sm text-muted-foreground">{t('scanner.ceremonyCheckIns')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats.reception}</p>
              <p className="text-sm text-muted-foreground">{t('scanner.receptionCheckIns')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {t('scanner.qrScanner')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as 'ceremony' | 'reception')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ceremony">{t('scanner.ceremony')}</SelectItem>
                <SelectItem value="reception">{t('scanner.reception')}</SelectItem>
              </SelectContent>
            </Select>

            {!isScanning && (
              <Button
                onClick={startScanning}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ScanLine className="mr-2 h-4 w-4" />
                {t('scanner.startScanning')}
              </Button>
            )}
          </div>

          {/* QR Reader */}
          {isScanning && (
            <div className="space-y-4">
              <div id="qr-reader" className="mx-auto max-w-md overflow-hidden rounded-lg" />
              <Button
                variant="outline"
                onClick={async () => {
                  if (scannerRef.current) {
                    await scannerRef.current.stop().catch(() => {});
                    scannerRef.current = null;
                  }
                  setIsScanning(false);
                }}
                className="w-full"
              >
                {t('scanner.stopScanning')}
              </Button>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div
              className={`rounded-lg border p-6 ${
                scanResult.success && !scanResult.allDuplicate
                  ? 'border-sage/50 bg-sage/10'
                  : scanResult.allDuplicate
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-destructive/50 bg-destructive/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    scanResult.success && !scanResult.allDuplicate
                      ? 'bg-sage/20'
                      : scanResult.allDuplicate
                        ? 'bg-primary/20'
                        : 'bg-destructive/20'
                  }`}
                >
                  {scanResult.success && !scanResult.allDuplicate ? (
                    <CheckCircle className="h-6 w-6 text-sage" />
                  ) : scanResult.allDuplicate ? (
                    <AlertTriangle className="h-6 w-6 text-primary" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  {scanResult.guest ? (
                    <>
                      <h3 className="font-serif text-xl font-semibold">
                        {scanResult.guest.first_name} {scanResult.guest.last_name}
                      </h3>
                      <p
                        className={`text-sm ${
                          scanResult.allDuplicate ? 'text-primary' : 'text-sage'
                        }`}
                      >
                        {scanResult.message}
                      </p>

                      {/* Family members */}
                      {scanResult.members && scanResult.members.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('scanner.familyGroup')} —{' '}
                            {t('scanner.groupMembers', { count: scanResult.members.length })}
                          </p>
                          {scanResult.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-2 text-sm">
                              {member.is_duplicate ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5 text-sage shrink-0" />
                              )}
                              <span className="flex-1">
                                {member.first_name} {member.last_name}
                              </span>
                              {member.seating && (
                                <span className="text-xs text-muted-foreground">
                                  {t('scanner.tableNumber', {
                                    number: String(member.seating.table_number),
                                  })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Categories */}
                      {scanResult.guest.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {scanResult.guest.categories.map((cat) => (
                            <Badge
                              key={cat.name}
                              variant="outline"
                              style={{
                                borderColor: cat.color,
                                color: cat.color,
                              }}
                            >
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-destructive">{scanResult.message}</p>
                  )}
                </div>
              </div>

              <Button
                onClick={startScanning}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('scanner.scanNextGuest')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
