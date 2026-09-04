# Brand assets

## The crest

Two files, both with transparent backgrounds:

| File                  | Artwork | Used in    |
| --------------------- | ------- | ---------- |
| `ube-logo-black.png`  | Black   | Light mode |
| `ube-logo-white.png`  | White   | Dark mode  |

`src/components/logo.tsx` renders both and swaps them with CSS on the `.dark`
class (`dark:hidden` / `hidden dark:block`). The correct mark is painted on the
first frame, so there is no flash of the wrong one and no JavaScript involved.
That also means it works inside a Server Component.

The crest is taller than it is wide (roughly 4:5), so the `size` prop sets the
**height** and the width follows the natural ratio.

### Replacing them

Keep the same two filenames and keep the backgrounds transparent. Anything from
about 440px tall upward stays crisp on retina screens. Nothing else needs
changing.

## Favicons

The browser-tab and iOS icons are built from the crest, not drawn separately:

| File                    | What it is                                        |
| ----------------------- | ------------------------------------------------- |
| `src/app/icon.png`      | 512x512 tab icon, black crest on white            |
| `src/app/apple-icon.png`| 180x180 iOS home screen icon, opaque as iOS needs |

Next.js picks both up by filename, so there is nothing to register.

They sit on a white ground rather than transparent, because the crest artwork
is black and would vanish against a dark browser tab strip.

Transparent square versions are here too, `crest-square-black.png` and
`crest-square-white.png`, for anything that supplies its own background.

Rebuild them after replacing the crest with:

```bash
npm run icons
```

That runs `scripts/make-icons.mjs`, which has no dependencies. It trims the
transparent edges off the artwork, resamples it and writes all four files.

## Anything else

Other brand files (kit mock-ups, sponsor logos, press shots) can live in this
folder too.
