"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useTranslation } from "@/locales/i18n-provider";
import {
  getTodayStats,
  processGuestScan,
} from "@/services";
import type { ScannerGuest } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ScanLine,
  Users,
} from "lucide-react";

type ScanResult = {
  success: boolean;
  guest?: ScannerGuest;
  isDuplicate?: boolean;
  message: string;
};

export default function ScannerPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const [eventType, setEventType] = useState<"ceremony" | "reception">(
    "ceremony",
  );
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [todayStats, setTodayStats] = useState({ ceremony: 0, reception: 0 });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const stats = await getTodayStats(supabase);
      setTodayStats(stats);
    } catch (error) {
      console.error("Error fetching today stats:", error);
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          setIsScanning(false);
          await handleScan(decodedText);
        },
        undefined,
      )
      .catch(() => {
        scannerRef.current = null;
        setIsScanning(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const handleScan = async (invitationGuid: string) => {
    try {
    const result = await processGuestScan(supabase, invitationGuid, eventType, profile?.id);

    if (!result.found) {
      setScanResult({
        success: false,
        message: t("scanner.guestNotFound"),
      });
      return;
    }

    setTodayStats(result.today_stats);

    setScanResult({
      success: true,
      isDuplicate: result.is_duplicate,
      guest: result.guest,
      message: result.is_duplicate
        ? t("scanner.alreadyCheckedIn")
        : t("scanner.checkInSuccess"),
    });
    } catch (error) {
      console.error("Error processing scan:", error);
      setScanResult({
        success: false,
        message: t("scanner.checkInError"),
      });
    }
  };

  const startScanning = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {t("scanner.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("scanner.description")}
        </p>
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
              <p className="text-sm text-muted-foreground">
                {t("scanner.ceremonyCheckIns")}
              </p>
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
              <p className="text-sm text-muted-foreground">
                {t("scanner.receptionCheckIns")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {t("scanner.qrScanner")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as "ceremony" | "reception")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ceremony">{t("scanner.ceremony")}</SelectItem>
                <SelectItem value="reception">{t("scanner.reception")}</SelectItem>
              </SelectContent>
            </Select>

            {!isScanning && (
              <Button
                onClick={startScanning}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ScanLine className="mr-2 h-4 w-4" />
                {t("scanner.startScanning")}
              </Button>
            )}
          </div>

          {/* QR Reader */}
          {isScanning && (
            <div className="space-y-4">
              <div
                id="qr-reader"
                className="mx-auto max-w-md overflow-hidden rounded-lg"
              />
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
                {t("scanner.stopScanning")}
              </Button>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div
              className={`rounded-lg border p-6 ${
                scanResult.success && !scanResult.isDuplicate
                  ? "border-sage/50 bg-sage/10"
                  : scanResult.isDuplicate
                    ? "border-primary/50 bg-primary/10"
                    : "border-destructive/50 bg-destructive/10"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    scanResult.success && !scanResult.isDuplicate
                      ? "bg-sage/20"
                      : scanResult.isDuplicate
                        ? "bg-primary/20"
                        : "bg-destructive/20"
                  }`}
                >
                  {scanResult.success && !scanResult.isDuplicate ? (
                    <CheckCircle className="h-6 w-6 text-sage" />
                  ) : scanResult.isDuplicate ? (
                    <AlertTriangle className="h-6 w-6 text-primary" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  {scanResult.guest ? (
                    <>
                      <h3 className="font-serif text-xl font-semibold">
                        {scanResult.guest.first_name}{" "}
                        {scanResult.guest.last_name}
                      </h3>
                      <p
                        className={`text-sm ${
                          scanResult.isDuplicate ? "text-primary" : "text-sage"
                        }`}
                      >
                        {scanResult.message}
                      </p>

                      {/* Categories */}
                      {scanResult.guest.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {scanResult.guest.categories.map((cat, i) => (
                            <Badge
                              key={i}
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

                      {/* Seating */}
                      {scanResult.guest.seating && (
                        <div className="mt-3 rounded-md bg-background/50 p-3">
                          <p className="text-sm font-medium">
                            {t("scanner.seatingAssignment")}
                          </p>
                          <p className="text-lg font-semibold">
                            {t("scanner.tableNumber", { number: String(scanResult.guest.seating.table_number) })}
                            {scanResult.guest.seating.seat_number && (
                              <>, {t("scanner.seatNumber", { number: String(scanResult.guest.seating.seat_number) })}</>
                            )}
                          </p>
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
                {t("scanner.scanNextGuest")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
