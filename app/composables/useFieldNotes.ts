import { fieldNotes, latestFieldNote, type FieldNote } from '~/data/fieldNotes'

/**
 * Field Notes — read-only access. Mirrors the shape of `useProjects()` so
 * the two systems feel like cousins to anyone reading the code.
 */
export const useFieldNotes = () => {
  const list = fieldNotes
  const latest = latestFieldNote

  const bySlug = (slug?: string | string[]): FieldNote | undefined => {
    if (!slug) return undefined
    const key = Array.isArray(slug) ? slug[0] : slug
    return list.find((n) => n.slug === key)
  }

  const next = (slug: FieldNote['slug']): FieldNote => {
    const i = list.findIndex((n) => n.slug === slug)
    return list[(i + 1) % list.length]!
  }

  const prev = (slug: FieldNote['slug']): FieldNote => {
    const i = list.findIndex((n) => n.slug === slug)
    return list[(i - 1 + list.length) % list.length]!
  }

  return { list, latest, bySlug, next, prev }
}

/** Format an ISO date as "22 Apr · 2026" — the print-style meta line. */
export const formatDispatchDate = (iso: string): string => {
  const d = new Date(iso)
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${String(d.getDate()).padStart(2, '0')} ${month} · ${d.getFullYear()}`
}
