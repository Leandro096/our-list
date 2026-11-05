const COLORS = ['#e8cfc0', '#efe5d3', '#c9a24b', '#a8936f', '#f3dcd0'];

/** Falling petals. Values are derived from the index so server and client render the same thing. */
export function Petals({ count = 14, className = '' }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {Array.from({ length: count }, (_, i) => {
        const size = 9 + ((i * 5) % 11);
        return (
          <span
            key={i}
            className="px-petal"
            style={{
              left: `${(i * 37 + 8) % 100}%`,
              width: size,
              height: size * 1.25,
              background: COLORS[i % COLORS.length],
              animationDuration: `${11 + ((i * 7) % 9)}s`,
              animationDelay: `${-((i * 1.7) % 14)}s`,
            }}
          />
        );
      })}
    </div>
  );
}
