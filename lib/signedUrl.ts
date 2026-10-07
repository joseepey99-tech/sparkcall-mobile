import { supabase } from './supabase'

const EXPIRES = 6 * 3600

export function chatPath(m: any): string | null {
  if (m?.media_path) return m.media_path
  if (m?.media_url) return String(m.media_url).split('/ChatMedia/')[1] || null
  return null
}

export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (!paths.length) return out
  const { data } = await supabase.storage.from('ChatMedia').createSignedUrls(paths, EXPIRES)
  const rows = data || []
  rows.forEach((d: any) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl })
  return out
}