"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { useTranslation } from "@/locales";

import { Button } from "@/components/ui";

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
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
    >
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {t(titleKey)}
        </h1>
        {descriptionKey && (
          <p className="mt-1 text-muted-foreground">{t(descriptionKey)}</p>
        )}
      </div>
      {actionKey && actionHref && (
        <Button
          asChild
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Link href={actionHref}>
            <Plus className="mr-2 h-4 w-4" />
            {t(actionKey)}
          </Link>
        </Button>
      )}
    </div>
  );
}
