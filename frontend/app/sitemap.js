export const dynamic = 'force-dynamic'

import { getTodas, SITE_URL } from '@/lib/wordpress'

export default async function sitemap() {
  const [entradas, paginas] = await Promise.all([getTodas('posts'), getTodas('pages')])
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    ...[...entradas, ...paginas].map(p => ({ url: `${SITE_URL}/${p.slug}/`, lastModified: p.modified })),
  ]
}
