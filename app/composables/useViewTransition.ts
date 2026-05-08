/**
 * Minimal helper to wrap a navigation in a View Transition where supported.
 * Falls back to immediate navigation if the API isn't available.
 */
export const useViewTransition = () => {
  const router = useRouter()

  const startTransition = (to: string) => {
    if (typeof document === 'undefined') return router.push(to)
    const anyDoc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> }
    }
    if (typeof anyDoc.startViewTransition === 'function') {
      return anyDoc.startViewTransition(() => router.push(to))
    }
    return router.push(to)
  }

  return { startTransition }
}
