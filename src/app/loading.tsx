export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <span className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ink"
            style={{
              animation: 'fade-up 0.9s ease-in-out infinite alternate',
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </span>
    </div>
  );
}
