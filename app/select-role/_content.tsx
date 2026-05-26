'use client';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { SelectRoleContent } from '@/components/select-role/select-role-content';

// ---- Suspense wrapper (exported for use by the server page) ----------------

export default function SelectRoleClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <SelectRoleContent />
    </Suspense>
  );
}
