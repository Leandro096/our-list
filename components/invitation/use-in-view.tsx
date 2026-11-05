'use client';

import { useRef, useState, useEffect } from 'react';

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, seen] as const;
}

export type RevealVariant = 'rise' | 'zoom' | 'wipe' | 'iris' | 'curtain' | 'left' | 'right';

/** Reveals its children with one of several entrances. The styles live in <PassStyles />. */
export function Rv({
  children,
  variant = 'rise',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
}) {
  // The observed wrapper is never clipped: Chrome reports a fully clipped element as not intersecting,
  // so a clip-path reveal on the observed element itself would never start.
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={className}>
      <div
        data-seen={seen}
        data-variant={variant}
        className="px-rv h-full"
        style={{ '--d': `${delay}s` } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Writes a CSS variable on the element as the page scrolls, without re-rendering React.
 * `calc` receives the element's rect and the viewport height. With reduced motion it writes `reduced`.
 */
export function useScrollVar<T extends HTMLElement>(
  name: string,
  calc: (rect: DOMRect, viewport: number) => number,
  reduced: number
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.setProperty(name, String(reduced));
      return undefined;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      node.style.setProperty(name, String(calc(node.getBoundingClientRect(), window.innerHeight)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // calc is defined inline by callers and is stable in behaviour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, reduced]);

  return ref;
}
