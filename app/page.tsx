'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  X,
  Menu,
  Heart,
  Users,
  Shield,
  ScanLine,
  Armchair,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { useTranslation } from '@/locales';

import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function HomePage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setUser(!!data.session?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <span className="font-serif text-base font-semibold sm:text-xl">
              {t('home.appName')}
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden items-center gap-3 sm:flex">
            <LanguageSwitcher />
            {user ? (
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {t('home.goToDashboard')}
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild size="sm">
                  <Link href="/auth/login">{t('home.signIn')}</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/auth/sign-up">{t('home.getStarted')}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex items-center gap-2 sm:hidden">
            <LanguageSwitcher />
            {user ? (
              <Button
                asChild
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <button
                className="flex h-9 w-9 items-center justify-center rounded-md"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu — only shown when not logged in */}
        {menuOpen && !user && (
          <div className="border-t border-border bg-background px-4 pb-4 pt-3 sm:hidden">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                asChild
                className="w-full"
                onClick={() => setMenuOpen(false)}
              >
                <Link href="/auth/login">{t('home.signIn')}</Link>
              </Button>
              <Button
                asChild
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setMenuOpen(false)}
              >
                <Link href="/auth/sign-up">{t('home.getStarted')}</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-14 text-center sm:py-20 md:py-32">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary sm:mb-6 sm:px-4 sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('home.badge')}
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              {t('home.heroTitle')} <span className="text-primary">{t('home.heroHighlight')}</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
              {t('home.heroDescription')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
              {user ? (
                <Button
                  size="lg"
                  asChild
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('home.goToDashboard')}
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link href="/auth/sign-up">
                      {t('home.startPlanning')}
                      <Heart className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/auth/login">{t('home.signIn')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30 py-14 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center sm:mb-12">
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
                {t('home.featuresTitle')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {t('home.featuresSubtitle')}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
              <FeatureCard
                icon={Users}
                title={t('home.feature1Title')}
                description={t('home.feature1Desc')}
              />
              <FeatureCard
                icon={ScanLine}
                title={t('home.feature2Title')}
                description={t('home.feature2Desc')}
              />
              <FeatureCard
                icon={Armchair}
                title={t('home.feature3Title')}
                description={t('home.feature3Desc')}
              />
              <FeatureCard
                icon={Shield}
                title={t('home.feature4Title')}
                description={t('home.feature4Desc')}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 md:p-12">
              <h2 className="font-serif text-xl font-semibold sm:text-2xl md:text-3xl">
                {t('home.ctaTitle')}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
                {t('home.ctaDescription')}
              </p>
              {user ? (
                <Button
                  size="lg"
                  asChild
                  className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 sm:mt-8"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('home.goToDashboard')}
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  asChild
                  className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 sm:mt-8"
                >
                  <Link href="/auth/sign-up">{t('home.getStartedFree')}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span>{t('home.appName')}</span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} {t('home.allRightsReserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
