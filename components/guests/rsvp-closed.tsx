'use client'

import { MessageCircle } from 'lucide-react'

import { useI18n } from '@/locales'

import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card'

const WHATSAPP_NUMBER = '18094405962'

export function RsvpClosed() {
  const { t } = useI18n()

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}`

  return (
    <div className="mx-auto max-w-md">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="size-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{t('rsvp.closed.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">{t('rsvp.closed.message')}</p>
          <Button asChild className="w-full gap-2" variant="default">
            <a href={whatsappUrl} rel="noopener noreferrer" target="_blank">
              <MessageCircle className="size-4" />
              {t('rsvp.closed.whatsappLabel')}
              <span className="font-mono text-sm opacity-75">+{WHATSAPP_NUMBER}</span>
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
