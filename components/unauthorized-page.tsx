"use client";

import Link from "next/link";
import { ShieldXIcon } from "lucide-react";

import { useTranslation } from "@/locales";

import { Button } from "@/components/ui/button";

interface UnauthorizedPageProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export function UnauthorizedPage({
  title,
  description,
  showBackButton = true,
}: UnauthorizedPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldXIcon className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-semibold text-foreground">
          {title ?? t("errors.unauthorized.title")}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description ?? t("errors.unauthorized.description")}
        </p>
      </div>

      {showBackButton && (
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("errors.unauthorized.backToDashboard")}</Link>
        </Button>
      )}
    </div>
  );
}
