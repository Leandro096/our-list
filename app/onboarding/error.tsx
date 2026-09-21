'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Heart, TriangleAlert } from 'lucide-react';

import { toast } from '@/hooks';
import { useTranslation } from '@/locales';

import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OnboardingErrorPage({ error, reset }: ErrorPageProps) {
  const { t } = useTranslation();

  useEffect(() => {
    toast({
      title: t('errors.server.title'),
      description: t('errors.server.description'),
      variant: 'destructive',
    });
  }, [error, t]);

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="font-serif text-xl font-semibold text-foreground">
          {t('errors.server.title')}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('errors.server.description')}</p>
        {error.digest && <p className="text-xs text-muted-foreground/60">#{error.digest}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>{t('errors.server.tryAgain')}</Button>
        <Button asChild variant="outline">
          <Link href="/auth/login">
            <Heart className="mr-2 h-4 w-4" />
            {t('errors.server.backToHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
