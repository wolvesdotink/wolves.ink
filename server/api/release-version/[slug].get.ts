import { projects } from '~/data/projects'

interface ReleaseVersion {
  tag: string
  name: string | null
  publishedAt: string | null
  htmlUrl: string
}

interface GithubReleaseResponse {
  tag_name: string
  name: string | null
  published_at: string | null
  html_url: string
}

const GITHUB_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/

export default defineCachedEventHandler(
  async (event): Promise<ReleaseVersion | null> => {
    const slug = getRouterParam(event, 'slug')
    if (!slug) return null

    const project = projects.find((p) => p.slug === slug)
    if (!project) return null

    // Webapps keep their domain badge; only non-webapp open-source projects
    // get a version sticker.
    if (project.links.live) return null
    if (!project.links.github) return null

    const match = GITHUB_URL_RE.exec(project.links.github.href)
    if (!match) return null
    const [, owner, repo] = match

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'wolves.ink',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    const token = process.env.GITHUB_TOKEN
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      const data = await $fetch<GithubReleaseResponse>(
        `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
        { headers },
      )
      return {
        tag: data.tag_name,
        name: data.name ?? null,
        publishedAt: data.published_at ?? null,
        htmlUrl: data.html_url,
      }
    } catch (err: unknown) {
      // 404 = no releases yet; rate-limit/network = transient. Both fall back
      // to the Domain badge — a missing version is expected, not exceptional.
      const status =
        typeof err === 'object' && err !== null && 'statusCode' in err
          ? (err as { statusCode: number }).statusCode
          : undefined
      if (status !== 404) {
        console.warn(`[release-version] ${slug}: ${owner}/${repo} fetch failed`, err)
      }
      return null
    }
  },
  {
    maxAge: 60 * 60,
    swr: true,
    getKey: (event) => `release-version:${getRouterParam(event, 'slug')}`,
  },
)
