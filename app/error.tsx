'use client';

import Link from 'next/link';
import { Heart, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/locales';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-8 bg-background p-6 text-center md:p-10">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <span className="font-serif text-lg font-semibold text-foreground">
          {t('common.appName')}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
          <TriangleAlert className="h-12 w-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            {t('errors.server.title')}
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">{t('errors.server.description')}</p>
          {error.digest && <p className="text-xs text-muted-foreground/60">#{error.digest}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset}>{t('errors.server.tryAgain')}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t('errors.server.backToHome')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
