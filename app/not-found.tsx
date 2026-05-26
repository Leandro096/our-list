'use client';

import Link from 'next/link';
import { Heart, SearchX } from 'lucide-react';
import { useTranslation } from '@/locales';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
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
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-12 w-12 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <p className="font-serif text-7xl font-bold text-foreground/20">404</p>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            {t('errors.notFound.title')}
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('errors.notFound.description')}
          </p>
        </div>

        <Button asChild>
          <Link href="/">{t('errors.notFound.backToHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
