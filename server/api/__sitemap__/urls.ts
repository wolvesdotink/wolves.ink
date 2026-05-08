/**
 * Dynamic sitemap source — feeds @nuxtjs/sitemap with the slugs that
 * live in `app/data/`. The static routes (`/`, `/projects`,
 * `/field-notes`) are picked up automatically by the file-based router
 * and do NOT need to be listed here.
 *
 * The data files are imported with the `~/` alias because they're
 * bundled at build time — no DB call, no external fetch, and the
 * sitemap regenerates whenever a new project or note is added.
 *
 * `lastmod` keeps Google's "last crawled" hint useful: we use the
 * field-note's `date` for notes, and the current build time for
 * projects (we don't track per-project edit dates yet).
 */

import type { SitemapUrlInput } from '#sitemap/types'
import { defineSitemapEventHandler } from '#imports'
import { projects } from '~/data/projects'
import { fieldNotes } from '~/data/fieldNotes'

export default defineSitemapEventHandler(() => {
  const buildDate = new Date().toISOString()

  // Featured projects get the rich detail spread; non-featured ones
  // either have no spread (skip) or 301-redirect to their `live` URL,
  // so we only emit project pages that actually render content.
  const projectUrls: SitemapUrlInput[] = projects
    .filter((p) => Boolean(p.description?.length))
    .map((p) => ({
      loc: `/projects/${p.slug}`,
      lastmod: buildDate,
      changefreq: 'monthly',
      priority: p.featured ? 0.8 : 0.5,
    }))

  const fieldNoteUrls: SitemapUrlInput[] = fieldNotes.map((n) => ({
    loc: `/field-notes/${n.slug}`,
    lastmod: new Date(n.date).toISOString(),
    changefreq: 'yearly',
    priority: 0.6,
  }))

  return [...projectUrls, ...fieldNoteUrls]
})
