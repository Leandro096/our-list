'use client';

import { useRef, useEffect } from 'react';

import { createPetalScene } from './petal-scene';

/**
 * Falling rose petals, rendered in WebGL on a transparent canvas that fills its positioned parent.
 * The scene (shape, lighting and motion of the petals) lives in `petal-scene.ts`.
 * Purely decorative: it draws nothing without WebGL or when the visitor prefers reduced motion.
 */
export function Petals({
  count = 14,
  scale = 1,
  className = '',
}: {
  /** How many petals are in the air at once. */
  count?: number;
  /** Size multiplier for the petals. */
  scale?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return createPetalScene(canvas, { count, scale });
  }, [count, scale]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
