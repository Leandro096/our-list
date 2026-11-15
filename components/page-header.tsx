'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { useTranslation } from '@/locales';

import { Button } from '@/components/ui';

interface PageHeaderProps {
  titleKey: string;
  descriptionKey?: string;
  className?: string;
  actionKey?: string;
  actionHref?: string;
}

export function PageHeader({
  titleKey,
  descriptionKey,
  className,
  actionKey,
  actionHref,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between ${className ?? ''}`}
    >
      <div className="max-w-prose">
        <h1 className="text-balance break-words font-serif text-3xl leading-[1.1] tracking-tight sm:text-4xl">
          {t(titleKey)}
        </h1>
        {descriptionKey && (
          <p className="mt-2 leading-relaxed text-muted-foreground">{t(descriptionKey)}</p>
        )}
      </div>
      {actionKey && actionHref && (
        <Button asChild>
          <Link href={actionHref}>
            <Plus />
            {t(actionKey)}
          </Link>
        </Button>
      )}
    </div>
  );
}
