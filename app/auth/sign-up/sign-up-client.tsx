'use client';

import Link from 'next/link';
import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { User, Heart, Building2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { cn } from '@/lib';
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

type Step = 1 | 2;
type WorkspaceType = 'individual' | 'organization';

type State = {
  step: Step;
  email: string;
  password: string;
  displayName: string;
  workspaceType: WorkspaceType;
  workspaceName: string;
  error: string | null;
  isLoading: boolean;
};

type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

const initialState: State = {
  step: 1,
  email: '',
  password: '',
  displayName: '',
  workspaceType: 'individual',
  workspaceName: '',
  error: null,
  isLoading: false,
};

export default function SignUpPage() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, email, password, displayName, workspaceType, workspaceName, error, isLoading } =
    state;
  const router = useRouter();

  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    update({ error: null, step: 2 });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      update({ error: t('auth.workspace.nameRequired') });
      return;
    }

    const supabase = createClient();
    update({ isLoading: true, error: null });

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName || email.split('@')[0],
            tenant_type: workspaceType,
            workspace_name: workspaceName.trim(),
          },
        },
      });
      if (signUpError) throw signUpError;
      router.push('/auth/sign-up-success');
    } catch (err: unknown) {
      update({ error: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      update({ isLoading: false });
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              {t('common.appName')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('auth.signUpTagline')}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {([1, 2] as Step[]).map((s) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s}
                </div>
                <span
                  className={cn('text-sm', step >= s ? 'text-foreground' : 'text-muted-foreground')}
                >
                  {s === 1 ? t('auth.workspace.step1Title') : t('auth.workspace.step2Title')}
                </span>
                {s < 2 && <div className="ml-auto h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-xl">
                {step === 1 ? t('auth.createAccount') : t('auth.workspace.step2Title')}
              </CardTitle>
              <CardDescription>
                {step === 1 ? t('auth.createAccountDescription') : t('auth.workspace.step2Title')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* ---- Step 1: credentials ---- */}
              {step === 1 && (
                <form onSubmit={handleNextStep}>
                  <div className="flex flex-col gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="displayName">{t('auth.displayName')}</Label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder={t('auth.displayNamePlaceholder')}
                        value={displayName}
                        onChange={(e) => update({ displayName: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => update({ email: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">{t('auth.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => update({ password: e.target.value })}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">{t('auth.passwordMinLength')}</p>
                    </div>
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    <Button type="submit" className="h-11 w-full">
                      {t('common.next')}
                    </Button>
                  </div>
                  <div className="mt-6 text-center text-sm text-muted-foreground">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <Link
                      href="/auth/login"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t('auth.signIn')}
                    </Link>
                  </div>
                </form>
              )}

              {/* ---- Step 2: workspace ---- */}
              {step === 2 && (
                <form onSubmit={handleSignUp}>
                  <div className="flex flex-col gap-5">
                    {/* Workspace type selector */}
                    <div className="grid gap-2">
                      <Label>{t('auth.workspace.type')}</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            {
                              value: 'individual' as WorkspaceType,
                              icon: User,
                              label: t('auth.workspace.individual'),
                              desc: t('auth.workspace.individualDesc'),
                            },
                            {
                              value: 'organization' as WorkspaceType,
                              icon: Building2,
                              label: t('auth.workspace.organization'),
                              desc: t('auth.workspace.organizationDesc'),
                            },
                          ] as const
                        ).map(({ value, icon: Icon, label, desc }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => update({ workspaceType: value })}
                            className={cn(
                              'flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors',
                              workspaceType === value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-accent/50'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5',
                                workspaceType === value ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Workspace name */}
                    <div className="grid gap-2">
                      <Label htmlFor="workspaceName">{t('auth.workspace.name')}</Label>
                      <Input
                        id="workspaceName"
                        type="text"
                        placeholder={t('auth.workspace.namePlaceholder')}
                        required
                        value={workspaceName}
                        onChange={(e) => update({ workspaceName: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1"
                        onClick={() => update({ step: 1, error: null })}
                        disabled={isLoading}
                      >
                        {t('common.back')}
                      </Button>
                      <Button type="submit" className="h-11 flex-1" disabled={isLoading}>
                        {isLoading ? t('auth.creatingAccount') : t('auth.workspace.setupWorkspace')}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
