'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from 'lucide-react';

import { Button } from '@/components/ui';

interface QRCodeDisplayProps {
  guest: {
    id: string;
    invitation_guid: string;
    first_name: string;
    last_name: string;
  };
  helpText: string;
}

export function QRCodeDisplay({ guest, helpText }: QRCodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${guest.first_name} ${guest.last_name}</title>
          <style>
            body {
              font-family: 'Georgia', serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              text-align: center;
              padding: 40px;
              border: 2px solid #C9A84C;
              border-radius: 12px;
              max-width: 400px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 8px 0;
              color: #1C1917;
            }
            p {
              font-size: 14px;
              color: #6B7280;
              margin: 0 0 24px 0;
            }
            .qr-container {
              display: inline-block;
              padding: 16px;
              background: white;
              border-radius: 8px;
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #9CA3AF;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${guest.first_name} ${guest.last_name}</h1>
            <p>Wedding Guest Invitation</p>
            <div class="qr-container">
              ${document.getElementById('qr-svg')?.outerHTML || ''}
            </div>
            <p class="footer">Scan this code at check-in</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${guest.first_name}-${guest.last_name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div ref={printRef} className="flex flex-col items-center gap-5 py-2 text-center">
      <div className="rounded-lg border border-border bg-white p-3">
        <QRCodeSVG
          id="qr-svg"
          value={guest.invitation_guid}
          size={200}
          level="H"
          includeMargin
          fgColor="#35291F"
          bgColor="#FFFFFF"
        />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{helpText}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handlePrint}>
          <Printer />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download />
          Download
        </Button>
      </div>
    </div>
  );
}
