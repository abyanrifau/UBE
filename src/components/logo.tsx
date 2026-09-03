/**
 * The academy crest.
 *
 * Two transparent PNGs live in `public/brand`: black artwork for light mode,
 * white artwork for dark mode. Both are rendered and swapped with CSS on the
 * `.dark` class, so the right one is already painted on the first frame, with no
 * JavaScript, no flash of the wrong mark, and it works in a Server Component.
 *
 * The artwork is taller than it is wide, so `size` sets the height and the
 * width follows the natural ratio.
 */

const LIGHT_SRC = '/brand/ube-logo-black.png';
const DARK_SRC = '/brand/ube-logo-white.png';

export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  const shared = 'block w-auto max-w-none select-none object-contain';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ height: size }}
    >
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src={LIGHT_SRC}
        alt="UBE Academy crest"
        style={{ height: size }}
        className={`${shared} dark:hidden`}
        draggable={false}
      />
      <img
        src={DARK_SRC}
        alt=""
        aria-hidden
        style={{ height: size }}
        className={`${shared} hidden dark:block`}
        draggable={false}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}
