import { projects, type Project } from '~/data/projects'

export const useProjects = () => {
  const list = projects
  // Static data, so a plain filter is fine (no reactivity needed).
  const featured = list.filter((p) => p.featured)

  const bySlug = (slug?: string | string[]): Project | undefined => {
    if (!slug) return undefined
    const key = Array.isArray(slug) ? slug[0] : slug
    return list.find((p) => p.slug === key)
  }

  const next = (slug: Project['slug']): Project => {
    const i = list.findIndex((p) => p.slug === slug)
    return list[(i + 1) % list.length]!
  }

  const prev = (slug: Project['slug']): Project => {
    const i = list.findIndex((p) => p.slug === slug)
    return list[(i - 1 + list.length) % list.length]!
  }

  return { list, featured, bySlug, next, prev }
}
