'use client';

import Link from 'next/link';
import { Mail, Heart } from 'lucide-react';

import { useTranslation } from '@/locales';

import { Card, Button, CardTitle, CardHeader, CardContent, CardDescription } from '@/components/ui';

export default function SignUpSuccessPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              {t('common.appName')}
            </h1>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage/20">
                <Mail className="h-8 w-8 text-sage" />
              </div>
              <CardTitle className="font-serif text-xl">{t('auth.checkEmail')}</CardTitle>
              <CardDescription className="text-base">
                {t('auth.checkEmailDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-sm text-muted-foreground">{t('auth.checkEmailDetails')}</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/login">{t('auth.backToSignIn')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
