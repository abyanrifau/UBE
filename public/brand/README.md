# Brand assets

## The crest

Two files, both with transparent backgrounds:

| File                  | Artwork | Used in    |
| --------------------- | ------- | ---------- |
| `ube-logo-black.png`  | Black   | Light mode |
| `ube-logo-white.png`  | White   | Dark mode  |

`src/components/logo.tsx` renders both and swaps them with CSS on the `.dark`
class (`dark:hidden` / `hidden dark:block`). The correct mark is painted on the
first frame, so there is no flash of the wrong one and no JavaScript involved —
the component works in a Server Component.

The crest is taller than it is wide (roughly 4:5), so the `size` prop sets the
**height** and the width follows the natural ratio.

### Replacing them

Keep the same two filenames and keep the backgrounds transparent. Anything from
about 440px tall upward stays crisp on retina screens. Nothing else needs
changing.

## Anything else

Other brand files (kit mock-ups, sponsor logos, press shots) can live in this
folder too. The browser-tab icon is generated separately from
`src/app/icon.svg`.
