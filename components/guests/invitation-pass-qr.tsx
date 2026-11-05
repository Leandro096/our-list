'use client';

import { Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';

import { useTranslation } from '@/locales/i18n-provider';

/**
 * Entry QR. It encodes the invitation GUID, which is exactly what the reception scanner
 * (/dashboard/scanner) reads to check the family in and show their table.
 */
export function InvitationPassQr({ guid, fileName }: { guid: string; fileName: string }) {
  const { t } = useTranslation();

  const download = () => {
    const svg = document.getElementById('pass-qr-svg');
    if (!svg) return;
    const size = 720;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <QRCodeSVG
          id="pass-qr-svg"
          value={guid}
          size={232}
          level="H"
          marginSize={2}
          fgColor="#3b2a1f"
          bgColor="#ffffff"
          role="img"
          aria-label={t('invitations.page.pass.qrTitle')}
        />
      </div>
      <Button variant="outline" onClick={download}>
        <Download />
        {t('invitations.page.pass.saveQr')}
      </Button>
    </div>
  );
}
