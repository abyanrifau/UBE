import Link from 'next/link';
import type { Metadata } from 'next';
import { ACADEMY } from '@/lib/config';
import { getInstagramPosts } from '@/lib/instagram';
import { Logo } from '@/components/logo';
import { ThemeProvider, ThemeToggle } from '@/components/theme';
import { PublicEvents } from '@/components/public-events';
import { DemoBanner } from '@/components/demo-banner';

export const metadata: Metadata = {
  title: `${ACADEMY.name}, volleyball in ${ACADEMY.location}`,
  description: `${ACADEMY.expansion}. ${ACADEMY.tagline}`,
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function HomePage() {
  const posts = await getInstagramPosts(9);

  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col">
        <DemoBanner />
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={34} />
              <span className="text-[15px] font-bold uppercase tracking-[0.2em]">
                UBE
                <span className="ml-2 hidden font-medium tracking-[0.16em] text-muted sm:inline">
                  Academy
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <Link href="/login" className="btn-primary btn-sm">
                Log in
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* ---------------------------------------------------------- */}
          {/* Hero                                                        */}
          {/* ---------------------------------------------------------- */}
          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
              <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="animate-fade-up">
                  <p className="eyebrow">Volleyball Academy · {ACADEMY.location}</p>
                  <h1 className="mt-5 text-[clamp(2.6rem,8vw,5.25rem)] font-black uppercase leading-[0.92] tracking-[-0.03em]">
                    <span className="block">UBE</span>
                    <span className="block">Academy</span>
                  </h1>
                  <p className="mt-7 max-w-md text-[17px] leading-relaxed text-muted">
                    {ACADEMY.tagline}
                  </p>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <a
                      href={ACADEMY.joinFormUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn-primary"
                    >
                      Apply to join
                    </a>
                    <Link href="/login" className="btn-secondary">
                      Member log in
                    </Link>
                  </div>
                </div>

                <div className="hidden justify-self-center lg:block">
                  <Logo size={300} />
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Instagram                                                   */}
          {/* ---------------------------------------------------------- */}
          <section id="feed" className="border-b border-line">
            <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">From the court</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Latest on Instagram
                  </h2>
                </div>
                <a
                  href={ACADEMY.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Follow @{ACADEMY.instagramHandle}
                </a>
              </div>

              {posts.length > 0 ? (
                <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
                  {posts.map((post) => (
                    <a
                      key={post.id}
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group relative block aspect-square overflow-hidden bg-paper"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt={post.caption?.slice(0, 120) ?? 'UBE Academy on Instagram'}
                        loading="lazy"
                        className="h-full w-full object-cover grayscale transition duration-500 group-hover:scale-[1.04] group-hover:grayscale-0"
                      />
                      {post.caption && (
                        <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="line-clamp-3 text-[12px] leading-snug text-white">
                            {post.caption}
                          </span>
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <InstagramFallback />
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* About and contact                                           */}
          {/* ---------------------------------------------------------- */}
          <section className="border-b border-line">
            <div className="mx-auto grid max-w-6xl gap-px bg-line lg:grid-cols-2">
              <div className="bg-paper px-5 py-14 sm:px-8 sm:py-16">
                <p className="eyebrow">About</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">The {ACADEMY.expansion}</h2>
                <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">
                  <p>
                    UBE Academy is a volleyball academy in {ACADEMY.location}, with a
                    men&rsquo;s team and a women&rsquo;s team. Most of our players are between 17
                    and 21, and training is held mainly in Hulhumal&eacute;.
                  </p>
                  <p>
                    We compete, and we also take players who are newer to the game. There is one
                    squad rather than an A team and a B team: everyone trains together, and the
                    lineup for each tournament is picked from the whole group. Starting out does
                    not mean training on your own in a corner.
                  </p>
                  <p>
                    What we ask for is turning up. Consistent attendance is what turns a group of
                    people who play volleyball into a team.
                  </p>
                </div>

                <a
                  href={ACADEMY.joinFormUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-primary mt-8"
                >
                  Apply to join
                </a>
              </div>

              <div className="bg-paper px-5 py-14 sm:px-8 sm:py-16">
                <p className="eyebrow">Contact</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">Get in touch</h2>
                <dl className="mt-6 divide-line border-t border-line">
                  <ContactRow label="Instagram">
                    <a
                      href={ACADEMY.instagram}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline-offset-4 hover:underline"
                    >
                      @{ACADEMY.instagramHandle}
                    </a>
                  </ContactRow>
                  <ContactRow label="Join the academy">
                    <a
                      href={ACADEMY.joinFormUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline-offset-4 hover:underline"
                    >
                      Application form
                    </a>
                  </ContactRow>
                  <ContactRow label="Training">{ACADEMY.location}</ContactRow>
                  <ContactRow label="Members">
                    <Link href="/login" className="underline-offset-4 hover:underline">
                      Log in to the platform
                    </Link>
                  </ContactRow>
                </dl>

                <p className="mt-5 text-[13px] leading-relaxed text-muted">
                  Instagram is the fastest way to reach us. Questions about trials, fixtures or
                  playing a friendly are all welcome there.
                </p>

                <div className="mt-10">
                  <p className="eyebrow">Coming up</p>
                  <PublicEvents />
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted sm:flex-row sm:px-8">
            <span>
              © {new Date().getFullYear()} {ACADEMY.name}, {ACADEMY.location}
            </span>
            <div className="flex items-center gap-5">
              <a
                href={ACADEMY.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-ink"
              >
                Instagram
              </a>
              <a
                href={ACADEMY.joinFormUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-ink"
              >
                Apply to join
              </a>
              <Link href="/login" className="hover:text-ink">
                Member log in
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-right text-[14px] font-medium">{children}</dd>
    </div>
  );
}

function InstagramFallback() {
  return (
    <div className="border border-line">
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex aspect-square items-center justify-center bg-subtle">
            <Logo size={44} className="opacity-15" />
          </div>
        ))}
      </div>
      <div className="border-t border-line px-5 py-6 text-center">
        <p className="text-sm font-semibold">The live feed is not connected yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
          Add an <code className="font-mono text-[12px]">INSTAGRAM_ACCESS_TOKEN</code> to the
          environment and these tiles fill with the nine most recent posts. Setup steps are in{' '}
          <code className="font-mono text-[12px]">docs/INSTAGRAM.md</code>.
        </p>
        <a
          href={ACADEMY.instagram}
          target="_blank"
          rel="noreferrer noopener"
          className="btn-secondary btn-sm mt-5"
        >
          View on Instagram
        </a>
      </div>
    </div>
  );
}
