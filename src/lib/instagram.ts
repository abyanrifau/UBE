import { ACADEMY } from './config';

export type InstagramPost = {
  id: string;
  caption: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  imageUrl: string;
  permalink: string;
  timestamp: string;
};

type GraphMedia = {
  id: string;
  caption?: string;
  media_type: InstagramPost['mediaType'];
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

/**
 * Pulls recent posts from the Instagram Graph API.
 *
 * Requires INSTAGRAM_ACCESS_TOKEN — a long-lived token from an Instagram
 * account connected through "Instagram API with Instagram Login" (the
 * successor to the retired Basic Display API). Long-lived tokens last 60
 * days and must be refreshed; see docs/INSTAGRAM.md.
 *
 * With no token configured this returns an empty list and the homepage falls
 * back to a link-out panel, so the site never breaks because of Instagram.
 */
export async function getInstagramPosts(limit = 9): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  const url = new URL('https://graph.instagram.com/me/media');
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
  );
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', token);

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[instagram] ${res.status} ${res.statusText}`);
      return [];
    }
    const json = (await res.json()) as { data?: GraphMedia[] };
    return (json.data ?? [])
      .map((m) => ({
        id: m.id,
        caption: m.caption ?? null,
        mediaType: m.media_type,
        imageUrl: m.media_type === 'VIDEO' ? (m.thumbnail_url ?? '') : (m.media_url ?? ''),
        permalink: m.permalink,
        timestamp: m.timestamp,
      }))
      .filter((p) => p.imageUrl)
      .slice(0, limit);
  } catch (err) {
    console.warn('[instagram] fetch failed', err);
    return [];
  }
}

export const instagramProfileUrl = ACADEMY.instagram;
