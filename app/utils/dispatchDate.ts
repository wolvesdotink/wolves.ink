/**
 * Format an ISO date as "22 Apr · 2026" — the print-style meta line.
 *
 * Lives in utils (not next to `useFieldNotes`) so the header can use it
 * without importing the field-notes data module into the entry chunk.
 */
export const formatDispatchDate = (iso: string): string => {
  const d = new Date(iso)
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${String(d.getDate()).padStart(2, '0')} ${month} · ${d.getFullYear()}`
}
