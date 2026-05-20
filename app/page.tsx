"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, Users, ScanLine, Armchair, Shield, Sparkles } from 'lucide-react'
import { useTranslation } from '@/locales/i18n-provider'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <span className="font-serif text-xl font-semibold">{t("home.appName")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">{t("home.signIn")}</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/auth/sign-up">{t("home.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center md:py-32">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              {t("home.badge")}
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              {t("home.heroTitle")}{' '}
              <span className="text-primary">{t("home.heroHighlight")}</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              {t("home.heroDescription")}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/auth/sign-up">
                  {t("home.startPlanning")}
                  <Heart className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">{t("home.signIn")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl font-semibold">
                {t("home.featuresTitle")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("home.featuresSubtitle")}
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Users}
                title={t("home.feature1Title")}
                description={t("home.feature1Desc")}
              />
              <FeatureCard
                icon={ScanLine}
                title={t("home.feature2Title")}
                description={t("home.feature2Desc")}
              />
              <FeatureCard
                icon={Armchair}
                title={t("home.feature3Title")}
                description={t("home.feature3Desc")}
              />
              <FeatureCard
                icon={Shield}
                title={t("home.feature4Title")}
                description={t("home.feature4Desc")}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-8 md:p-12">
              <h2 className="font-serif text-2xl font-semibold md:text-3xl">
                {t("home.ctaTitle")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("home.ctaDescription")}
              </p>
              <Button size="lg" asChild className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/auth/sign-up">
                  {t("home.getStartedFree")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span>{t("home.appName")}</span>
          </div>
          <p>&copy; {new Date().getFullYear()} {t("home.allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
