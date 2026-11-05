'use client';

import { Wine, Church, Ticket, MapPin } from 'lucide-react';
import { useState, useEffect, type CSSProperties } from 'react';

import {
  PARENTS,
  COUPLE_NAMES,
  PHOTOGRAPHER,
  EVENT_DETAILS,
  INVITATION_PHOTOS,
  formatWeddingDate,
} from '@/lib/invitation';

import { LanguageSwitcher } from '@/components/language-switcher';
import { AddToCalendar } from '@/components/guests/add-to-calendar';
import { InvitationPassQr } from '@/components/guests/invitation-pass-qr';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

import { Petals } from './petals';
import { Countdown } from './countdown';
import { PassStyles } from './pass-styles';
import { DressCodeSection } from './dress-code-section';
import { Rv, useInView, useScrollVar } from './use-in-view';
import {
  GiftsSection,
  type PortalTheme,
  type PublicGiftLink,
  type PublicBankAccount,
} from './gifts-section';

interface PassExperienceProps {
  code: string;
  guid: string;
  firstName: string;
  /** Everyone covered by this invitation who has confirmed, full names. */
  members: string[];
  showCeremony: boolean;
  showReception: boolean;
  accounts: PublicBankAccount[];
  links: PublicGiftLink[];
  portalTheme: PortalTheme;
}

const mapsUrl = (venue: string, exact?: string) =>
  exact || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;

const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties;

export function PassExperience({
  code,
  guid,
  firstName,
  members,
  showCeremony,
  showReception,
  accounts,
  links,
  portalTheme,
}: PassExperienceProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [passInView, setPassInView] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const node = document.getElementById('pase');
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => setPassInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const goToPass = () =>
    document.getElementById('pase')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const nameParts = COUPLE_NAMES.split('&').map((part) => part.trim());
  const hasAmpersand = nameParts.length === 2;
  let letterIndex = 0;
  const renderLetters = (text: string, extra = '') =>
    Array.from(text).map((char, i) =>
      char === ' ' ? (
        <span key={`s${i}`} className="inline-block w-[.3em]" />
      ) : (
        <span
          key={`${char}${i}`}
          aria-hidden
          className={`px-letter ${extra}`}
          style={{ '--i': letterIndex++ } as CSSProperties}
        >
          {char}
        </span>
      )
    );

  return (
    <div className="px-root px-go">
      <PassStyles />

      {/* ============ HERO ============ */}
      <header className="relative flex min-h-svh items-end overflow-hidden bg-[var(--night)] text-[var(--paper)]">
        <img
          src={INVITATION_PHOTOS.hero}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="px-kenburns absolute inset-0 h-full w-full object-cover object-[35%_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--night)] via-[var(--night)]/55 via-45% to-[var(--night)]/10" />
        <Petals count={16} className="px-petals-hero" />

        <div className="absolute right-4 top-4 z-20 rounded-full bg-[var(--paper)]/85 backdrop-blur">
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-24 pt-40 text-center sm:pb-28">
          <h1
            aria-label={COUPLE_NAMES}
            className="font-[family-name:var(--font-script)] text-[5.5rem] leading-[.95] sm:text-[8rem]"
          >
            {hasAmpersand ? (
              <>
                <span className="block">{renderLetters(nameParts[0])}</span>
                <span className="block text-5xl text-[var(--gold)] sm:text-6xl">
                  {renderLetters('&')}
                </span>
                <span className="block">{renderLetters(nameParts[1])}</span>
              </>
            ) : (
              renderLetters(COUPLE_NAMES)
            )}
          </h1>

          <div className="px-hero-rule mx-auto mt-6 h-px w-24 bg-[var(--gold)]" />

          <p
            className="px-hero-fade mt-6 font-[family-name:var(--font-invitation)] text-2xl italic"
            style={delay(2.6)}
          >
            {t('invitations.page.greeting', { name: firstName })}
          </p>
          <p
            className="px-hero-fade mx-auto mt-2 max-w-md font-[family-name:var(--font-invitation)] text-xl opacity-90"
            style={delay(3)}
          >
            {t('invitations.page.pass.exp.heroLine')}
          </p>
          <p className="px-hero-fade mt-5 text-lg first-letter:uppercase" style={delay(3.4)}>
            {formatWeddingDate(locale)}
          </p>
        </div>

        <div
          className="px-hero-fade px-cue absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-2 text-sm text-[var(--paper)]/80"
          style={delay(4)}
        >
          {t('invitations.page.pass.exp.scroll')}
        </div>
      </header>

      {/* ============ LETTER ============ */}
      <section className="relative bg-[var(--paper)] px-6 py-24 text-center">
        <div className="mx-auto max-w-xl">
          <Rv variant="rise">
            <RingsDivider />
          </Rv>
          <Rv variant="rise" delay={0.1}>
            <h2 className="mt-6 font-[family-name:var(--font-invitation)] text-4xl font-medium text-balance sm:text-5xl">
              {t('invitations.page.pass.exp.letterTitle')}
            </h2>
          </Rv>
          <div className="mt-8 space-y-5 font-[family-name:var(--font-invitation)] text-xl leading-relaxed text-[var(--ink)]/90 sm:text-2xl">
            <Rv variant="rise" delay={0.1}>
              <p>{t('invitations.page.pass.exp.letterP1')}</p>
            </Rv>
            <Rv variant="rise" delay={0.15}>
              <p>{t('invitations.page.pass.exp.letterP2')}</p>
            </Rv>
            <Rv variant="rise" delay={0.2}>
              <p>{t('invitations.page.pass.exp.letterP3')}</p>
            </Rv>
          </div>
          <Rv variant="wipe" delay={0.2} className="mt-10 inline-block">
            <p className="font-[family-name:var(--font-script)] text-4xl text-[var(--khaki)] sm:text-5xl">
              {t('invitations.page.pass.exp.letterSign', { names: COUPLE_NAMES })}
            </p>
          </Rv>
        </div>
      </section>

      {/* ============ COUNTDOWN ============ */}
      <section className="relative overflow-hidden bg-[var(--night)] px-6 py-24 text-center text-[var(--paper)]">
        <div
          aria-hidden
          className="px-aurora -left-24 -top-24 size-96 bg-[var(--gold)]/25"
          style={{ position: 'absolute' }}
        />
        <div
          aria-hidden
          className="px-aurora -bottom-32 -right-24 size-[26rem] bg-[#8a5a3c]/35"
          style={{ position: 'absolute', animationDelay: '-7s' }}
        />
        {Array.from({ length: 26 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="px-star"
            style={{
              left: `${(i * 41 + 7) % 100}%`,
              top: `${(i * 29 + 11) % 100}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              animationDelay: `${-((i * 0.9) % 4)}s`,
            }}
          />
        ))}
        <div className="relative mx-auto max-w-xl">
          <Rv variant="zoom">
            <h2 className="mb-10 font-[family-name:var(--font-script)] text-5xl sm:text-6xl">
              {t('invitations.page.pass.exp.countTitle')}
            </h2>
          </Rv>
          <Rv variant="rise" delay={0.2}>
            <Countdown />
          </Rv>
        </div>
      </section>

      {/* ============ PARENTS ============ */}
      <section className="relative overflow-hidden bg-[var(--sand)] px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <Rv variant="zoom">
            <h2 className="mx-auto max-w-md font-[family-name:var(--font-script)] text-5xl leading-tight text-balance text-[var(--ink)] sm:text-6xl">
              {t('invitations.page.pass.exp.parentsTitle')}
            </h2>
          </Rv>
          <div className="mt-14 grid items-center gap-10 sm:grid-cols-[1fr_auto_1fr] sm:gap-8">
            <Rv variant="left" delay={0.1}>
              <ParentsBlock
                label={t('invitations.page.pass.exp.brideParents')}
                names={PARENTS.bride}
              />
            </Rv>
            <Rv variant="zoom" delay={0.35}>
              <RingsDivider />
            </Rv>
            <Rv variant="right" delay={0.1}>
              <ParentsBlock
                label={t('invitations.page.pass.exp.groomParents')}
                names={PARENTS.groom}
              />
            </Rv>
          </div>
        </div>
      </section>

      {/* ============ THE DAY ============ */}
      <section className="bg-[var(--paper)] px-6 py-24">
        <div className="mx-auto max-w-xl">
          <Rv variant="rise">
            <h2 className="text-center font-[family-name:var(--font-invitation)] text-4xl font-medium sm:text-5xl">
              {t('invitations.page.pass.exp.dayTitle')}
            </h2>
          </Rv>
          <Rv variant="rise" delay={0.1} className="mt-5 flex justify-center">
            <AddToCalendar />
          </Rv>
          <Timeline>
            {showCeremony && (
              <Stop
                icon={<Church className="size-5" />}
                title={t('invitations.page.pass.ceremony')}
                note={t('invitations.page.pass.exp.ceremonyNote')}
                time={EVENT_DETAILS.ceremony.time}
                venue={EVENT_DETAILS.ceremony.venue}
                mapsLink={EVENT_DETAILS.ceremony.mapsUrl}
              />
            )}
            {showReception && (
              <Stop
                icon={<Wine className="size-5" />}
                title={t('invitations.page.pass.reception')}
                note={t('invitations.page.pass.exp.receptionNote')}
                time={EVENT_DETAILS.reception.time}
                venue={EVENT_DETAILS.reception.venue}
                mapsLink={EVENT_DETAILS.reception.mapsUrl}
              />
            )}
          </Timeline>
        </div>
      </section>

      {/* ============ GALLERY ============ */}
      <section className="overflow-hidden bg-[var(--sand)] px-5 py-24">
        <Rv variant="rise">
          <h2 className="mb-12 text-center font-[family-name:var(--font-script)] text-5xl text-[var(--ink)] sm:text-6xl">
            {t('invitations.page.pass.exp.galleryTitle')}
          </h2>
        </Rv>
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-3 sm:gap-5">
          <Photo src={INVITATION_PHOTOS.strip[0]} className="col-span-4 aspect-[4/5]" amp={-30} />
          <Photo
            src={INVITATION_PHOTOS.strip[1]}
            className="col-span-2 mt-16 aspect-[2/3]"
            amp={-60}
          />
          <Photo
            src={INVITATION_PHOTOS.strip[2]}
            className="col-span-6 aspect-[16/10] sm:col-span-4 sm:col-start-2"
            amp={-24}
          />
        </div>
      </section>

      {/* ============ DRESS CODE + ADULTS ONLY ============ */}
      <DressCodeSection />

      {/* ============ GIFTS ============ */}
      <GiftsSection accounts={accounts} links={links} portalTheme={portalTheme} />

      {/* ============ PASS ============ */}
      <section id="pase" className="relative bg-[var(--paper)] px-5 py-24">
        <Rv variant="rise">
          <h2 className="mb-10 text-center font-[family-name:var(--font-invitation)] text-4xl font-medium sm:text-5xl">
            {t('invitations.page.pass.qrTitle')}
          </h2>
        </Rv>
        <div className="mx-auto max-w-sm">
          <Rv variant="zoom" delay={0.1}>
            <div className="px-ticket relative rounded-3xl border border-[var(--border)] bg-white px-6 pb-8 pt-8 text-center shadow-[0_24px_60px_-28px_rgba(59,42,31,.45)]">
              <p className="font-[family-name:var(--font-script)] text-4xl text-[var(--ink)]">
                {COUPLE_NAMES}
              </p>
              <p className="mt-1 text-[var(--khaki)] first-letter:uppercase">
                {formatWeddingDate(locale)}
              </p>

              <div className="relative -mx-6 my-6">
                <span className="absolute left-0 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--paper)] [clip-path:inset(0_0_0_50%)]" />
                <span className="absolute right-0 top-1/2 size-6 -translate-y-1/2 translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--paper)] [clip-path:inset(0_50%_0_0)]" />
                <div className="mx-6 border-t-2 border-dashed border-[var(--border)]" />
              </div>

              <Rv variant="iris" delay={0.3}>
                <InvitationPassQr guid={guid} fileName={`invitacion-${code}`} />
              </Rv>
              <p className="mx-auto mt-5 max-w-xs text-sm text-[var(--muted-foreground)]">
                {t('invitations.page.pass.qrHelp')}
              </p>

              {members.length > 1 && (
                <div className="mt-6 border-t border-[var(--border)] pt-4 text-left">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t('invitations.page.pass.group')}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {members.map((name) => (
                      <li key={name} className="font-medium">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Rv>

          <Rv variant="rise" delay={0.1}>
            <h3 className="mb-4 mt-12 text-center font-[family-name:var(--font-invitation)] text-2xl font-medium">
              {t('invitations.page.pass.exp.stepsTitle')}
            </h3>
          </Rv>
          <ol className="space-y-3">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <Step key={step} n={i + 1} text={t(`invitations.page.pass.exp.${step}`)} />
            ))}
          </ol>
        </div>
      </section>

      {/* ============ CLOSING ============ */}
      <footer className="relative overflow-hidden bg-[var(--night)] px-6 pb-16 pt-28 text-center text-[var(--paper)]">
        <Petals count={12} />
        <div className="relative mx-auto max-w-xl">
          <HeartDraw />
          <Rv variant="wipe" delay={0.4} className="mt-8 inline-block">
            <h2 className="font-[family-name:var(--font-script)] text-5xl text-balance sm:text-6xl">
              {t('invitations.page.pass.exp.closingTitle')}
            </h2>
          </Rv>
          <Rv variant="rise" delay={0.6}>
            <p className="mt-5 font-[family-name:var(--font-invitation)] text-xl italic opacity-90">
              {t('invitations.page.pass.exp.closingBody')}
            </p>
          </Rv>
          <p className="mt-16 text-sm text-[var(--sand)]/70">
            {t('invitations.page.photoCredit')}{' '}
            <a
              href={PHOTOGRAPHER.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="underline decoration-[var(--gold)] underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            >
              {PHOTOGRAPHER.handle}
            </a>
          </p>
        </div>
      </footer>

      {/* ============ FLOATING SHORTCUT TO THE QR ============ */}
      {scrolled && !passInView && (
        <button
          type="button"
          onClick={goToPass}
          className="px-pill fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-[var(--paper)] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
        >
          <Ticket className="size-4" />
          {t('invitations.page.pass.exp.pill')}
        </button>
      )}
    </div>
  );
}

/* ---------------- pieces ---------------- */

function ParentsBlock({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-invitation)] text-lg italic text-[var(--khaki)]">
        {label}
      </p>
      <div className="mx-auto my-3 h-px w-10 bg-[var(--gold)]" />
      <ul className="space-y-1 font-[family-name:var(--font-invitation)] text-2xl font-medium sm:text-3xl">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

function RingsDivider() {
  const [ref, seen] = useInView<SVGSVGElement>(0.5);
  return (
    <svg
      ref={ref}
      data-seen={seen}
      viewBox="0 0 80 48"
      className="px-draw mx-auto h-12 w-20 fill-none stroke-[var(--gold)]"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="30" cy="24" r="16" pathLength="1" />
      <circle cx="50" cy="24" r="16" pathLength="1" className="px-d2" />
    </svg>
  );
}

function HeartDraw() {
  const [ref, seen] = useInView<SVGSVGElement>(0.5);
  return (
    <svg
      ref={ref}
      data-seen={seen}
      viewBox="0 0 24 24"
      className="px-draw px-beat mx-auto size-20 fill-none stroke-[var(--gold)]"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        pathLength="1"
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      />
    </svg>
  );
}

function Timeline({ children }: { children: React.ReactNode }) {
  return <ol className="relative mt-14">{children}</ol>;
}

function Stop({
  icon,
  title,
  note,
  time,
  venue,
  mapsLink,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  time?: string;
  venue?: string;
  mapsLink?: string;
}) {
  const { t } = useTranslation();
  const [ref, seen] = useInView<HTMLLIElement>(0.4);
  const isEvent = time !== undefined;

  return (
    <li ref={ref} className="group relative pb-14 pl-16 last:pb-0">
      {/* Connector down to the next icon. The last stop has none, so the line ends at its icon. */}
      <span
        aria-hidden
        className="absolute -bottom-5 left-5 top-5 w-px bg-[var(--border)] group-last:hidden"
      />
      <span
        aria-hidden
        data-seen={seen}
        className="px-seg absolute -bottom-5 left-5 top-5 w-px bg-[var(--gold)] shadow-[0_0_8px_rgba(201,162,75,.8)] group-last:hidden"
      />
      <span
        data-seen={seen}
        className="px-dot absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-[var(--gold)] bg-[var(--paper)] text-[var(--ink)]"
      >
        {icon}
      </span>
      <div data-seen={seen} data-variant="rise" className="px-rv">
        <h3 className="font-[family-name:var(--font-invitation)] text-3xl font-medium">{title}</h3>
        <p className="mt-1 text-[var(--muted-foreground)]">{note}</p>
        {isEvent && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-[var(--muted-foreground)]">{t('invitations.page.pass.when')}</dt>
            <dd>{time || t('invitations.page.pass.toBeAnnounced')}</dd>
            <dt className="text-[var(--muted-foreground)]">{t('invitations.page.pass.where')}</dt>
            <dd>{venue || t('invitations.page.pass.toBeAnnounced')}</dd>
          </dl>
        )}
        {venue && (
          <a
            href={mapsUrl(venue, mapsLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)] px-4 py-2 text-sm transition-colors hover:bg-[var(--gold)]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
          >
            <MapPin className="size-4" />
            {t('invitations.page.pass.exp.directions')}
          </a>
        )}
      </div>
    </li>
  );
}

function Photo({ src, className, amp }: { src: string; className: string; amp: number }) {
  const ref = useScrollVar<HTMLDivElement>(
    '--py',
    (rect, vh) => (rect.top + rect.height / 2 - vh / 2) / vh,
    0
  );
  return (
    <div
      ref={ref}
      className={`px-par ${className}`}
      style={{ '--amp': `${amp}px` } as CSSProperties}
    >
      <Rv variant="curtain" className="size-full overflow-hidden rounded-md shadow-xl">
        <img src={src} alt="" loading="lazy" className="size-full object-cover" />
      </Rv>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  const [ref, seen] = useInView<HTMLLIElement>(0.6);
  return (
    <li
      ref={ref}
      data-seen={seen}
      className="px-step flex items-center gap-4 rounded-xl border border-[var(--border)] bg-white px-4 py-3"
    >
      <span className="px-step-n grid size-8 shrink-0 place-items-center rounded-full bg-[var(--sand)] font-medium">
        {n}
      </span>
      <span>{text}</span>
    </li>
  );
}
