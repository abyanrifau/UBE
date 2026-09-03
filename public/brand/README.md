# Brand assets

## The crest

Save the academy crest here as:

```
public/brand/ube-logo.png
```

Requirements — deliberately minimal, because the app does the rest:

- **Black artwork on a plain white background.** The file you already have is
  exactly right. Do **not** pre-remove the background and do **not** make a
  separate white version for dark mode.
- Square-ish, and at least 512×512 so it stays crisp on retina screens.

### Why no editing is needed

`.brand-mark` in `src/app/globals.css` handles both jobs with CSS blend modes:

| Theme | CSS applied                          | Result                                        |
| ----- | ------------------------------------ | --------------------------------------------- |
| Light | `mix-blend-mode: multiply`           | White background drops out, artwork stays black |
| Dark  | `filter: invert(1)` + `screen`       | Artwork becomes white, background drops out     |

So one file covers both themes, with no transparency, no build step and no
image-processing dependency.

Until the file exists, `src/components/logo.tsx` renders a vector stand-in
crest. It is probed once per page load, so there is never a broken image.

## Anything else

Other brand files (kit mock-ups, sponsor logos, favicons) can live in this
folder too. The app icon is generated from `src/app/icon.svg`.
