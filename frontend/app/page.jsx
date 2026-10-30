import { permanentRedirect } from 'next/navigation'
import Listado from '@/components/Listado'
import DatosEstructurados from '@/components/DatosEstructurados'
import { getSitio, SITE_URL } from '@/lib/wordpress'
import { textoPlano } from '@/lib/contenido'

const API_URL = process.env.WORDPRESS_API_URL || 'http://localhost:8080/wp-json'

/** Los enlaces cortos de WordPress (/?p=123, /?page_id=16) siguen llevando a su entrada */
async function slugDe(tipo, id) {
  try {
    const res = await fetch(`${API_URL}/wp/v2/${tipo}/${Number(id)}?_fields=slug`, { next: { revalidate: 86400, tags: ['wp'] } })
    return res.ok ? (await res.json()).slug : null
  } catch {
    return null
  }
}

export default async function Inicio({ searchParams }) {
  const { p, page_id: pageId, s } = await searchParams
  if (s) permanentRedirect(`/buscar/?q=${encodeURIComponent(s)}`)
  if (p || pageId) {
    const slug = (p && (await slugDe('posts', p))) || (await slugDe('pages', pageId || p))
    if (slug) permanentRedirect(`/${slug}/`)
  }

  const sitio = await getSitio()
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: sitio.nombre,
        description: textoPlano(sitio.descripcion),
        url: `${SITE_URL}/`,
        inLanguage: 'es-ES',
        potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/buscar/?q={q}`, 'query-input': 'required name=q' },
      },
      {
        '@type': 'Person',
        name: 'Francisco Tapias Bravo',
        alternateName: 'FreeMEM',
        url: SITE_URL,
        sameAs: ['https://github.com/FreeMEM'],
      },
    ],
  }
  return (
    <>
      <DatosEstructurados datos={ld} />
      <Listado conPortada />
    </>
  )
}
