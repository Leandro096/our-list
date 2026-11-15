'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, MailCheck } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { useTranslation } from '@/locales';

import {
  Card,
  Input,
  Label,
  Button,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from '@/components/ui';

export default function ForgotPasswordClient() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // The email link lands on the callback, which exchanges the code for a
        // session and then forwards the user to the reset form.
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
            {sent ? (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-xl">
                    {t('auth.resetEmailSentTitle')}
                  </CardTitle>
                  <CardDescription>{t('auth.resetEmailSentDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="h-11 w-full">
                    <Link href="/auth/login">{t('auth.backToSignIn')}</Link>
                  </Button>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-serif text-xl">
                    {t('auth.forgotPasswordTitle')}
                  </CardTitle>
                  <CardDescription>{t('auth.forgotPasswordDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-5">
                      <div className="grid gap-2">
                        <Label htmlFor="email">{t('auth.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isLoading}
                      >
                        {isLoading ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
                      </Button>
                      <Link
                        href="/auth/login"
                        className="text-center text-sm text-muted-foreground hover:text-foreground"
                      >
                        {t('auth.backToSignIn')}
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
