import { getEntradas, getSitio, SITE_URL } from '@/lib/wordpress'
import { textoPlano } from '@/lib/contenido'

const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET() {
  const [sitio, { entradas }] = await Promise.all([getSitio(), getEntradas({ porPagina: 20 })])
  const items = entradas
    .map(
      e => `    <item>
      <title>${x(textoPlano(e.titulo))}</title>
      <link>${SITE_URL}/${e.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/${e.slug}/</guid>
      <pubDate>${new Date(e.fecha).toUTCString()}</pubDate>
      ${e.categorias.map(c => `<category>${x(c.nombre)}</category>`).join('')}
      <description>${x(textoPlano(e.extracto))}</description>
    </item>`
    )
    .join('\n')
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${x(sitio.nombre)}</title>
    <link>${SITE_URL}/</link>
    <atom:link href="${SITE_URL}/feed/" rel="self" type="application/rss+xml" />
    <description>${x(textoPlano(sitio.descripcion))}</description>
    <language>es-ES</language>
${items}
  </channel>
</rss>`
  return new Response(rss, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } })
}
