export function formatDistanceToNow(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Gerade eben'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}
