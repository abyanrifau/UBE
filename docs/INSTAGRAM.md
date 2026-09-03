# Connecting the Instagram feed

The public homepage shows the nine most recent posts from
[@ube.academy](https://www.instagram.com/ube.academy/).

**This needs an access token that only you can generate. It cannot be
committed to the repo and nobody else can create it for you.** Until
`INSTAGRAM_ACCESS_TOKEN` is set, the homepage shows a placeholder grid and a
"View on Instagram" button. Nothing breaks; the rest of the site is unaffected.

## Why there is a token at all

Instagram has no public, key-free feed API. The old **Instagram Basic Display
API** was shut down in **December 2024**. Its replacement is **Instagram API
with Instagram Login**, which is what `src/lib/instagram.ts` calls.

## Getting a token

1. Go to [developers.facebook.com](https://developers.facebook.com/) and sign
   in with the account that manages the UBE Academy Instagram.
2. **My Apps > Create App**, then pick the **Business** app type.
3. In the app dashboard, add the **Instagram** product and choose
   **API setup with Instagram login**.
4. Under **Generate access tokens**, connect the `@ube.academy` account. The
   account must be a **Professional** account, Creator or Business. Switch it
   in the Instagram app under Settings, Account type, if it is still Personal.
5. Grant at least the `instagram_business_basic` permission.
6. Copy the generated **long-lived access token**.

## Using it

Local development, add it to `.env.local`:

```bash
INSTAGRAM_ACCESS_TOKEN=IGQVJ...
```

Vercel: **Project > Settings > Environment Variables**, add
`INSTAGRAM_ACCESS_TOKEN` for Production and Preview, then redeploy.

The feed is cached for one hour (`revalidate: 3600` in
`src/lib/instagram.ts`), so posts appear within an hour of going up and
Instagram's rate limits are never a concern.

## Keeping it alive

Long-lived tokens last **60 days** and must be refreshed before they expire.
Two options:

- **Manual.** Set a calendar reminder, regenerate in the dashboard, update
  the Vercel variable. Fine for an academy site.
- **Automatic.** Call the refresh endpoint from a scheduled job:

  ```
  GET https://graph.instagram.com/refresh_access_token
      ?grant_type=ig_refresh_token
      &access_token=<current token>
  ```

  It returns a fresh 60-day token. A token must be at least 24 hours old
  before it can be refreshed.

If the token lapses, `getInstagramPosts` logs a warning server-side, returns an
empty list, and the homepage falls back to the placeholder grid. Visitors never
see an error.

## The simpler alternative

If maintaining a token is not worth it, replace the grid in
`src/app/page.tsx` with a third-party embed widget (LightWidget, Elfsight,
SnapWidget). Those handle authentication themselves, at the cost of an external
script and their branding on the free tiers.
