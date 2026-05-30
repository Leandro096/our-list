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
                    ),
                  )}
                </div>
              </div>

              {/* Right: GL Logo with botanical ring */}
              <div className="relative flex items-center justify-center">
                <BotanicalRing />
                <div className="relative z-10 rounded-full shadow-[0_24px_80px_-10px_oklch(0.72_0.12_85/0.35)] dark:shadow-[0_24px_80px_-10px_oklch(0.76_0.13_85/0.25)]">
                  <Image
                    src="/icon.png"
                    alt="Guest List App"
                    width={256}
                    height={256}
                    className="h-52 w-52 rounded-full sm:h-64 sm:w-64"
                    priority
                  />
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
        <section className="relative overflow-hidden bg-[oklch(0.17_0.075_258)] py-20 sm:py-28 dark:bg-[oklch(0.13_0.06_258)]">
          {/* Gold radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_50%_50%,oklch(0.72_0.12_85/0.09)_0%,transparent_70%)]" />
          {/* Top/bottom hairlines */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          {/* Botanical corners */}
          <BotanicalCorner className="absolute -left-2 bottom-0 h-44 w-44 rotate-0 text-primary/15" />
          <BotanicalCorner className="absolute -right-2 top-0 h-44 w-44 rotate-180 text-primary/15" />

          <div className="container relative mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl">
              {/* Ornament */}
              <div className="mb-5 flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary/70" />
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary/70" />
              </div>

              <h2 className="font-serif text-2xl font-semibold text-[oklch(0.95_0.008_85)] sm:text-3xl md:text-4xl">
                {t('home.ctaTitle')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[oklch(0.72_0.04_258)] sm:text-base">
                {t('home.ctaDescription')}
              </p>

              {user ? (
                <Button
                  size="lg"
                  asChild
                  className="mt-8 bg-primary text-primary-foreground shadow-[0_4px_24px_oklch(0.72_0.12_85/0.45)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_6px_36px_oklch(0.72_0.12_85/0.65)]"
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
                  className="mt-8 bg-primary text-primary-foreground shadow-[0_4px_24px_oklch(0.72_0.12_85/0.45)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_6px_36px_oklch(0.72_0.12_85/0.65)]"
                >
                  <Link href="/auth/sign-up">{t('home.getStartedFree')}</Link>
                </Button>
              )}
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
          <p className="text-xs">
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
      <span className="select-none font-serif text-5xl font-bold leading-none text-primary/10 dark:text-primary/8">
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
 * BotanicalRing — SVG que replica el ornamento botánico del ícono GL:
 * rama curva central con hojas ovales alternas, flores de 5 pétalos y bayas.
 * Gira muy lentamente para dar vida sutil al hero.
 */
function BotanicalRing() {
  // Paleta: color gold aplicado vía currentColor (text-primary/30)
  // Viewbox 500×500, centro 250,250
  // La rama recorre un arco circular a ~155px del centro
  return (
    <svg
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute h-[340px] w-[340px] animate-[spin_120s_linear_infinite] text-primary/35 sm:h-[400px] sm:w-[400px]"
      aria-hidden="true"
    >
      <defs>
        {/* Gradiente radial que simula el acabado metálico dorado */}
        <radialGradient id="goldSheen" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      {/* ── Anillo exterior con guiones decorativos ── */}
      <circle
        cx="250" cy="250" r="228"
        stroke="currentColor" strokeOpacity="0.4"
        strokeWidth="0.7" strokeDasharray="2 10"
        fill="none"
      />
      {/* ── Anillo interior sólido ── */}
      <circle
        cx="250" cy="250" r="195"
        stroke="currentColor" strokeOpacity="0.55"
        strokeWidth="1" fill="none"
      />

      {/* ════════════════════════════════════════════
          RAMA BOTÁNICA INFERIOR-IZQUIERDA
          Idéntica a la del ícono GL: tallo curvo,
          hojas alternas, flores y bayas.
          ════════════════════════════════════════════ */}
      <g fill="url(#goldSheen)" stroke="none">

        {/* Tallo principal: curva S desde izq. hasta centro-inferior */}
        <path
          d="M 72,310 C 100,295 130,305 158,292 C 186,279 200,268 228,262 C 248,257 258,260 268,258"
          fill="none"
          stroke="currentColor" strokeOpacity="0.9"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Extensión rama derecha */}
        <path
          d="M 268,258 C 290,254 308,248 328,243"
          fill="none"
          stroke="currentColor" strokeOpacity="0.9"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* ── Hoja 1 — arriba-izq ── */}
        <g transform="translate(110,288) rotate(-38)">
          <ellipse cx="0" cy="0" rx="5" ry="13" />
          <line x1="0" y1="-13" x2="0" y2="13" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6" />
        </g>
        {/* ── Hoja 2 — abajo-izq ── */}
        <g transform="translate(118,306) rotate(28)">
          <ellipse cx="0" cy="0" rx="4.5" ry="11" />
        </g>

        {/* ── Hoja 3 — arriba ── */}
        <g transform="translate(148,278) rotate(-42)">
          <ellipse cx="0" cy="0" rx="5" ry="14" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6" />
        </g>
        {/* ── Hoja 4 — abajo ── */}
        <g transform="translate(158,296) rotate(32)">
          <ellipse cx="0" cy="0" rx="4.5" ry="12" />
        </g>

        {/* ── Hoja 5 — arriba ── */}
        <g transform="translate(182,271) rotate(-45)">
          <ellipse cx="0" cy="0" rx="4.5" ry="13" />
          <line x1="0" y1="-13" x2="0" y2="13" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6" />
        </g>
        {/* ── Hoja 6 — abajo ── */}
        <g transform="translate(193,283) rotate(35)">
          <ellipse cx="0" cy="0" rx="4" ry="11" />
        </g>

        {/* ── Hoja 7 — arriba ── */}
        <g transform="translate(214,263) rotate(-48)">
          <ellipse cx="0" cy="0" rx="4" ry="12" />
          <line x1="0" y1="-12" x2="0" y2="12" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6" />
        </g>
        {/* ── Hoja 8 — abajo ── */}
        <g transform="translate(224,272) rotate(38)">
          <ellipse cx="0" cy="0" rx="4" ry="10" />
        </g>

        {/* ── Hoja 9 derecha-arriba ── */}
        <g transform="translate(290,248) rotate(-50)">
          <ellipse cx="0" cy="0" rx="3.5" ry="10" />
        </g>
        {/* ── Hoja 10 derecha-abajo ── */}
        <g transform="translate(300,257) rotate(40)">
          <ellipse cx="0" cy="0" rx="3.5" ry="9" />
        </g>
        {/* ── Hoja 11 extremo-derecha ── */}
        <g transform="translate(320,244) rotate(-52)">
          <ellipse cx="0" cy="0" rx="3" ry="8" />
        </g>

        {/* ── Flor 1 (5 pétalos) — centro-izquierda ── */}
        <g transform="translate(94,298)">
          <circle cx="0" cy="0" r="2.8" />
          {/* pétalos */}
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx={Math.cos((deg * Math.PI) / 180) * 5.5}
              cy={Math.sin((deg * Math.PI) / 180) * 5.5}
              rx="2.2"
              ry="3.5"
              transform={`rotate(${deg + 90}, ${Math.cos((deg * Math.PI) / 180) * 5.5}, ${Math.sin((deg * Math.PI) / 180) * 5.5})`}
            />
          ))}
        </g>

        {/* ── Flor 2 — centro ── */}
        <g transform="translate(243,267)">
          <circle cx="0" cy="0" r="2.5" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx={Math.cos((deg * Math.PI) / 180) * 5}
              cy={Math.sin((deg * Math.PI) / 180) * 5}
              rx="2"
              ry="3.2"
              transform={`rotate(${deg + 90}, ${Math.cos((deg * Math.PI) / 180) * 5}, ${Math.sin((deg * Math.PI) / 180) * 5})`}
            />
          ))}
        </g>

        {/* ── Bayas izquierda (racimo pequeño) ── */}
        <g transform="translate(82,307)">
          <circle cx="0" cy="0" r="2.2" />
          <circle cx="5" cy="-3" r="2" />
          <circle cx="9" cy="2" r="1.8" />
          {/* tallitos */}
          <line x1="0" y1="0" x2="4" y2="-6" stroke="currentColor" strokeOpacity="0.7" strokeWidth="0.8" />
          <line x1="0" y1="0" x2="8" y2="-1" stroke="currentColor" strokeOpacity="0.7" strokeWidth="0.8" />
        </g>

        {/* ── Bayas derecha ── */}
        <g transform="translate(315,253)">
          <circle cx="0" cy="0" r="2" />
          <circle cx="6" cy="-2" r="1.8" />
          <line x1="0" y1="0" x2="5" y2="-5" stroke="currentColor" strokeOpacity="0.7" strokeWidth="0.7" />
        </g>

        {/* ── Baya suelta extremo ── */}
        <circle cx="332" cy="243" r="2.5" />
        <circle cx="340" cy="240" r="1.8" />

      </g>

      {/* ════════════════════════════════════════════
          ESPEJO — rama botánica superior-derecha
          (la misma rama rotada 180°)
          ════════════════════════════════════════════ */}
      <use href="#botanicalBranch" transform="rotate(180, 250, 250)" />
    </svg>
  );
}

/** Botanical branch for decorating corners of the CTA navy section */
function BotanicalCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 130"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12,118 Q35,65 88,18" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <ellipse cx="38" cy="80" rx="9" ry="16" transform="rotate(-42,38,80)" />
      <ellipse cx="55" cy="58" rx="8" ry="14" transform="rotate(-52,55,58)" />
      <ellipse cx="72" cy="38" rx="7" ry="12" transform="rotate(-58,72,38)" />
      <circle cx="88" cy="20" r="4.5" />
      <circle cx="28" cy="96" r="3.5" />
      <circle cx="18" cy="110" r="2.5" />
    </svg>
  );
}
