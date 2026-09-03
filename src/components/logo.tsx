'use client';

import { useEffect, useState } from 'react';

/**
 * The academy crest.
 *
 * Drop the supplied artwork at `public/brand/ube-logo.png` — black on a white
 * background, square, no pre-processing needed. `.brand-mark` in globals.css
 * keys the white out with `mix-blend-mode: multiply` in light mode, and
 * inverts the artwork to white with `screen` in dark mode.
 *
 * Until that file is present the vector crest below stands in. The real file
 * is probed once per page load and the result shared by every instance, so
 * there is never a broken-image flash and never a repeated request.
 */

const LOGO_SRC = '/brand/ube-logo.png';

type ProbeState = 'unknown' | 'present' | 'missing';
let probeState: ProbeState = 'unknown';
let probePromise: Promise<ProbeState> | null = null;
const listeners = new Set<(s: ProbeState) => void>();

function probe(): Promise<ProbeState> {
  if (probeState !== 'unknown') return Promise.resolve(probeState);
  if (probePromise) return probePromise;

  probePromise = new Promise<ProbeState>((resolve) => {
    const img = new Image();
    const settle = (state: ProbeState) => {
      probeState = state;
      listeners.forEach((fn) => fn(state));
      resolve(state);
    };
    img.onload = () => settle('present');
    img.onerror = () => settle('missing');
    img.src = LOGO_SRC;
  });

  return probePromise;
}

export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  const [state, setState] = useState<ProbeState>(probeState);

  useEffect(() => {
    if (probeState !== 'unknown') {
      setState(probeState);
      return;
    }
    listeners.add(setState);
    void probe();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  if (state !== 'present') {
    return <CrestMark size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="UBE Academy crest"
      width={size}
      height={size}
      className={`brand-mark shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/** Vector stand-in: shield, UBE monogram, two volleyballs. */
function CrestMark({ size, className }: { size: number; className: string }) {
  return (
    <svg
      viewBox="0 0 100 116"
      width={size}
      height={size}
      role="img"
      aria-label="UBE Academy crest"
      className={`shrink-0 text-ink ${className}`}
      style={{ width: size, height: size }}
    >
      <path
        d="M5 4h90v74L50 112 5 78Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="miter"
      />
      <text
        x="50"
        y="56"
        textAnchor="middle"
        fontSize="27"
        fontWeight="800"
        letterSpacing="0.5"
        fill="currentColor"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        UBE
      </text>
      <path d="M28 66h44" stroke="currentColor" strokeWidth="4" />
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {[30, 70].map((cx) => (
          <g key={cx} transform={`translate(${cx} 82)`}>
            <circle r="6.6" strokeWidth="2.4" />
            <path d="M-6.4-1.3C-2.6-0.1-0.6 2.6 0 6.5" />
            <path d="M6.4-1.3C2.6-0.1 0.6 2.6 0 6.5" />
            <path d="M-4.9-4.4C-1 -1.4 3-1.8 6.1-2.7" />
          </g>
        ))}
      </g>
    </svg>
  );
}
