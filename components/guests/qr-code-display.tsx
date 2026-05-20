'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'

interface QRCodeDisplayProps {
  guest: {
    id: string
    invitation_guid: string
    first_name: string
    last_name: string
  }
}

export function QRCodeDisplay({ guest }: QRCodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

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
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `qr-${guest.first_name}-${guest.last_name}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/guests/${guest.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Guest
        </Link>
      </Button>

      <Card ref={printRef}>
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">
            {guest.first_name} {guest.last_name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Wedding Guest Invitation</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <QRCodeSVG
              id="qr-svg"
              value={guest.invitation_guid}
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#1C1917"
              bgColor="#FFFFFF"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Scan this code at check-in
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
