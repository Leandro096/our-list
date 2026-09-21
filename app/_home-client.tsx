'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  CheckCircle2,
  LayoutDashboard,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import { useTranslation } from '@/locales';

import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/language-switcher';

export function HomeClientPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUser(!!data.session?.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(!!session?.user);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="GL Logo"
              width={38}
              height={38}
              className="shrink-0 rounded-full ring-1 ring-primary/30"
              priority
            />
            <div className="flex flex-col leading-none">
              <span className="font-serif text-sm font-bold tracking-wide sm:text-base">
                {t('home.appName')}
              </span>
              <span className="hidden text-[10px] uppercase tracking-widest text-primary sm:block">
                {t('home.weddingApp')}
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-3 sm:flex">
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
                <Button
                  variant="ghost"
                  asChild
                  size="sm"
                  className="text-foreground/80 hover:text-foreground"
                >
                  <Link href="/auth/login">{t('home.signIn')}</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-primary text-primary-foreground shadow-[0_2px_12px_oklch(0.72_0.12_85/0.35)] hover:bg-primary/90"
                >
                  <Link href="/auth/sign-up">{t('home.getStarted')}</Link>
                </Button>
              </>
            )}
          </nav>

          {/* Mobile right */}
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
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

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

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Gold radial glow from top */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,oklch(0.72_0.12_85/0.07)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,oklch(0.76_0.13_85/0.10)_0%,transparent_65%)]" />

          <div className="container mx-auto px-4 py-16 sm:py-24 md:py-32">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              {/* Left: Text */}
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                {/* Badge */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('home.badge')}
                </div>

                {/* Headline */}
                <h1 className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  {t('home.heroTitle')}
                  <br />
                  <span className="relative mt-1 inline-block bg-gradient-to-r from-primary via-[oklch(0.80_0.15_75)] to-primary bg-clip-text text-transparent">
                    {t('home.heroHighlight')}
                    <span className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {t('home.heroDescription')}
                </p>

                {/* CTA Buttons */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {user ? (
                    <Button
                      size="lg"
                      asChild
                      className="bg-primary text-primary-foreground shadow-[0_4px_20px_oklch(0.72_0.12_85/0.40)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_6px_28px_oklch(0.72_0.12_85/0.55)]"
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
                        className="bg-primary text-primary-foreground shadow-[0_4px_20px_oklch(0.72_0.12_85/0.40)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_6px_28px_oklch(0.72_0.12_85/0.55)]"
                      >
                        <Link href="/auth/sign-up">
                          {t('home.startPlanning')}
                          <Heart className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        asChild
                        className="border-border/70 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Link href="/auth/login">{t('home.signIn')}</Link>
                      </Button>
                    </>
                  )}
                </div>

                {/* Trust badges */}
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {([t('home.trust1'), t('home.trust2'), t('home.trust3')] as string[]).map(
                    (label) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {label}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Right: GL Logo with medallion rings */}
              <div className="relative flex min-h-[320px] items-center justify-center sm:min-h-[380px]">
                <div className="absolute h-[340px] w-[340px] rounded-full border border-dashed border-primary/15 sm:h-[400px] sm:w-[400px]" />
                <div className="absolute h-[284px] w-[284px] rounded-full border border-primary/25 sm:h-[334px] sm:w-[334px]" />
                <div className="absolute h-48 w-48 rounded-full bg-primary/8 blur-3xl sm:h-60 sm:w-60" />
                <MedallionRing />
                <div className="relative z-10 rounded-full shadow-[0_24px_80px_-10px_oklch(0.72_0.12_85/0.35)] dark:shadow-[0_24px_80px_-10px_oklch(0.76_0.13_85/0.25)]">
                  <div className="relative h-52 w-52 sm:h-64 sm:w-64">
                    <Image
                      src="/icon.png"
                      alt="Guest List App"
                      fill
                      sizes="(max-width: 640px) 208px, 256px"
                      className="rounded-full object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wavy gold section divider */}
          <div className="relative h-12 overflow-hidden">
            <svg
              viewBox="0 0 1440 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute bottom-0 left-0 w-full text-muted/25"
              preserveAspectRatio="none"
            >
              <path d="M0 48 Q360 0 720 24 Q1080 48 1440 8 L1440 48 Z" fill="currentColor" />
            </svg>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section className="bg-muted/20 py-16 sm:py-24">
          <div className="container mx-auto px-4">
            {/* Section header with ornament */}
            <div className="mb-12 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <span className="h-px w-14 bg-gradient-to-r from-transparent to-primary/50" />
                <Heart className="h-4 w-4 text-primary" />
                <span className="h-px w-14 bg-gradient-to-l from-transparent to-primary/50" />
              </div>
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl md:text-4xl">
                {t('home.featuresTitle')}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {t('home.featuresSubtitle')}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <FeatureCard
                icon={Users}
                number="01"
                title={t('home.feature1Title')}
                description={t('home.feature1Desc')}
              />
              <FeatureCard
                icon={ScanLine}
                number="02"
                title={t('home.feature2Title')}
                description={t('home.feature2Desc')}
              />
              <FeatureCard
                icon={Armchair}
                number="03"
                title={t('home.feature3Title')}
                description={t('home.feature3Desc')}
              />
              <FeatureCard
                icon={Shield}
                number="04"
                title={t('home.feature4Title')}
                description={t('home.feature4Desc')}
              />
            </div>
          </div>
        </section>

        {/* ── CTA — Navy full-width ────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[oklch(0.17_0.075_258)] py-24 sm:py-32 dark:bg-[oklch(0.13_0.06_258)]">
          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, oklch(0.72 0.12 85 / 0.13) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* GL icon watermark */}
          <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
            <div className="relative h-[560px] w-[560px] opacity-[0.05]">
              <Image
                src="/icon.png"
                alt=""
                fill
                sizes="560px"
                className="rounded-full object-cover"
              />
            </div>
          </div>
          {/* Gold radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_80%_at_50%_50%,oklch(0.72_0.12_85/0.08)_0%,transparent_70%)]" />
          {/* Hairlines */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

          <div className="container relative mx-auto px-4 text-center">
            <div className="mx-auto max-w-xl">
              {/* Ornamental rule */}
              <div className="mb-8 flex items-center justify-center gap-4">
                <svg
                  viewBox="0 0 100 8"
                  className="h-2 w-24 text-primary"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M0,4 Q25,1 50,4 Q75,7 100,4" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="0" cy="4" r="1.8" fill="currentColor" />
                  <circle cx="50" cy="4" r="2.2" fill="currentColor" />
                  <circle cx="100" cy="4" r="1.8" fill="currentColor" />
                </svg>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/15">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <svg
                  viewBox="0 0 100 8"
                  className="h-2 w-24 -scale-x-100 text-primary"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M0,4 Q25,1 50,4 Q75,7 100,4" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="0" cy="4" r="1.8" fill="currentColor" />
                  <circle cx="50" cy="4" r="2.2" fill="currentColor" />
                  <circle cx="100" cy="4" r="1.8" fill="currentColor" />
                </svg>
              </div>

              <h2 className="font-serif text-3xl font-semibold text-white/95 sm:text-4xl md:text-5xl">
                {t('home.ctaTitle')}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/55 sm:text-lg">
                {t('home.ctaDescription')}
              </p>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {user ? (
                  <Button
                    size="lg"
                    asChild
                    className="bg-primary text-primary-foreground shadow-[0_4px_28px_oklch(0.72_0.12_85/0.55)] transition-all duration-200 hover:scale-[1.03] hover:bg-primary/90"
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
                      className="bg-primary text-primary-foreground shadow-[0_4px_28px_oklch(0.72_0.12_85/0.55)] transition-all duration-200 hover:scale-[1.03] hover:bg-primary/90"
                    >
                      <Link href="/auth/sign-up">{t('home.getStartedFree')}</Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="border-white/20 text-white/80 hover:border-primary/60 hover:bg-primary/10 hover:text-white"
                    >
                      <Link href="/auth/login">{t('home.signIn')}</Link>
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
                {([t('home.trust1'), t('home.trust2'), t('home.trust3')] as string[]).map(
                  (label) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="GL Logo"
              width={28}
              height={28}
              className="rounded-full opacity-90 ring-1 ring-primary/20"
            />
            <div className="flex flex-col leading-none">
              <span className="font-serif text-sm font-semibold text-foreground">
                {t('home.appName')}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary">
                {t('home.weddingApp')}
              </span>
            </div>
          </div>
          <p className="text-xs" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {t('home.allRightsReserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_10px_32px_-8px_oklch(0.72_0.12_85/0.25)]">
      {/* Gold accent top bar — revealed on hover */}
      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {/* Ghost number */}
      <span className="select-none font-serif text-5xl font-bold leading-none text-primary/10 dark:text-primary/48">
        {number}
      </span>
      {/* Icon */}
      <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * MedallionRing — anillo ornamental con simetr\u00eda 4-fold, limpio, sin c\u00e1lculos din\u00e1micos.
 * 2 anillos circulares + 4 motivos de hojas cardinales + 4 diamantes en diagonal.
 */
function MedallionRing() {
  return (
    <svg
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute h-[340px] w-[340px] animate-[spin_120s_linear_infinite] text-primary/30 sm:h-[400px] sm:w-[400px]"
      aria-hidden="true"
    >
      {/* Outer dashed ring */}
      <circle
        cx="250"
        cy="250"
        r="228"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="0.7"
        strokeDasharray="2 10"
        fill="none"
      />
      {/* Inner solid ring */}
      <circle
        cx="250"
        cy="250"
        r="195"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1"
        fill="none"
      />

      {/* TOP (0\u00b0) — leaf motif pointing outward */}
      <g transform="translate(250,37) rotate(0)" fill="currentColor">
        <ellipse cx="0" cy="0" rx="4.5" ry="13" />
        <line
          x1="0"
          y1="-13"
          x2="0"
          y2="13"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          fill="none"
        />
        <ellipse cx="-7" cy="6" rx="3" ry="8" transform="rotate(26,-7,6)" />
        <ellipse cx="7" cy="6" rx="3" ry="8" transform="rotate(-26,7,6)" />
        <circle cx="0" cy="-19" r="2.3" />
      </g>
      {/* RIGHT (90\u00b0) */}
      <g transform="translate(463,250) rotate(90)" fill="currentColor">
        <ellipse cx="0" cy="0" rx="4.5" ry="13" />
        <line
          x1="0"
          y1="-13"
          x2="0"
          y2="13"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          fill="none"
        />
        <ellipse cx="-7" cy="6" rx="3" ry="8" transform="rotate(26,-7,6)" />
        <ellipse cx="7" cy="6" rx="3" ry="8" transform="rotate(-26,7,6)" />
        <circle cx="0" cy="-19" r="2.3" />
      </g>
      {/* BOTTOM (180\u00b0) */}
      <g transform="translate(250,463) rotate(180)" fill="currentColor">
        <ellipse cx="0" cy="0" rx="4.5" ry="13" />
        <line
          x1="0"
          y1="-13"
          x2="0"
          y2="13"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          fill="none"
        />
        <ellipse cx="-7" cy="6" rx="3" ry="8" transform="rotate(26,-7,6)" />
        <ellipse cx="7" cy="6" rx="3" ry="8" transform="rotate(-26,7,6)" />
        <circle cx="0" cy="-19" r="2.3" />
      </g>
      {/* LEFT (270\u00b0) */}
      <g transform="translate(37,250) rotate(270)" fill="currentColor">
        <ellipse cx="0" cy="0" rx="4.5" ry="13" />
        <line
          x1="0"
          y1="-13"
          x2="0"
          y2="13"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          fill="none"
        />
        <ellipse cx="-7" cy="6" rx="3" ry="8" transform="rotate(26,-7,6)" />
        <ellipse cx="7" cy="6" rx="3" ry="8" transform="rotate(-26,7,6)" />
        <circle cx="0" cy="-19" r="2.3" />
      </g>

      {/* Diamond ornaments at 45\u00b0 / 135\u00b0 / 225\u00b0 / 315\u00b0 */}
      <g transform="translate(401,99) rotate(45)" fill="currentColor">
        <path d="M0,-8 L5,0 L0,8 L-5,0 Z" />
      </g>
      <g transform="translate(401,401) rotate(135)" fill="currentColor">
        <path d="M0,-8 L5,0 L0,8 L-5,0 Z" />
      </g>
      <g transform="translate(99,401) rotate(225)" fill="currentColor">
        <path d="M0,-8 L5,0 L0,8 L-5,0 Z" />
      </g>
      <g transform="translate(99,99) rotate(315)" fill="currentColor">
        <path d="M0,-8 L5,0 L0,8 L-5,0 Z" />
      </g>
    </svg>
  );
}
