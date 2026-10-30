/**
 * Cliente de la API REST de WordPress. Solo se usa en el servidor.
 *
 * Todo lo que se pide lleva la etiqueta «wp»: cuando WordPress publica algo avisa
 * a /api/revalidate y se invalida de una vez. Mientras, cada respuesta vale cinco
 * minutos.
 */

const API_URL = process.env.WORDPRESS_API_URL || 'http://localhost:8080/wp-json'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const POR_PAGINA = 12

async function fetchWP(endpoint, { revalidate = 300 } = {}) {
  const url = `${API_URL}${endpoint}`
  try {
    const res = await fetch(url, { next: { revalidate, tags: ['wp'] } })
    if (!res.ok) {
      if (res.status !== 400 && res.status !== 404) console.error(`API ${res.status} - ${url}`)
      return { data: null, total: 0, paginas: 0 }
    }
    return {
      data: await res.json(),
      total: Number(res.headers.get('x-wp-total') || 0),
      paginas: Number(res.headers.get('x-wp-totalpages') || 0),
    }
  } catch (error) {
    console.error(`Fetch ${error.message} - ${url}`)
    return { data: null, total: 0, paginas: 0 }
  }
}

const CAMPOS_LISTA = 'id,date,slug,title,excerpt,categories,featured_media,_links,_embedded'

/** Normaliza una entrada de la API a lo que pintan los componentes */
function entrada(p) {
  if (!p) return null
  const media = p._embedded?.['wp:featuredmedia']?.[0]
  const terminos = p._embedded?.['wp:term'] || []
  return {
    id: p.id,
    tipo: p.type,
    slug: p.slug,
    fecha: p.date,
    modificada: p.modified,
    titulo: p.title?.rendered || '',
    extracto: p.excerpt?.rendered || '',
    contenido: p.content?.rendered || '',
    autor: p.freemem_autor?.nombre || 'Francisco Tapias Bravo',
    comentariosAbiertos: p.comment_status === 'open',
    categorias: (terminos[0] || []).filter(t => t.taxonomy === 'category').map(t => ({ id: t.id, slug: t.slug, nombre: t.name })),
    etiquetas: (terminos[1] || []).filter(t => t.taxonomy === 'post_tag').map(t => ({ id: t.id, slug: t.slug, nombre: t.name })),
    imagen: media?.source_url
      ? {
          src: media.source_url,
          ancho: media.media_details?.width,
          alto: media.media_details?.height,
          alt: media.alt_text || '',
          srcset: Object.values(media.media_details?.sizes || {})
            .filter(s => s.width)
            .sort((a, b) => a.width - b.width)
            .map(s => `${s.source_url} ${s.width}w`)
            .join(', '),
        }
      : null,
  }
}

export async function getEntradas({ pagina = 1, porPagina = POR_PAGINA, categoria, etiqueta, buscar } = {}) {
  const q = new URLSearchParams({ per_page: String(porPagina), page: String(pagina), _embed: 'wp:featuredmedia,wp:term' })
  if (categoria) q.set('categories', String(categoria))
  if (etiqueta) q.set('tags', String(etiqueta))
  if (buscar) q.set('search', buscar)
  const { data, total, paginas } = await fetchWP(`/wp/v2/posts?${q}`)
  return { entradas: (data || []).map(entrada), total, paginas }
}

/** Entrada o página por su slug: en el blog antiguo las dos viven en /<slug>/ */
export async function getPorSlug(slug) {
  const s = encodeURIComponent(slug)
  for (const tipo of ['posts', 'pages']) {
    const { data } = await fetchWP(`/wp/v2/${tipo}?slug=${s}&_embed=wp:featuredmedia,wp:term`)
    if (data?.[0]) return entrada(data[0])
  }
  return null
}

export async function getRelacionadas(e, cuantas = 4) {
  if (!e?.categorias?.length) return []
  const q = new URLSearchParams({
    categories: e.categorias.map(c => c.id).join(','),
    exclude: String(e.id),
    per_page: String(cuantas),
    _embed: 'wp:featuredmedia,wp:term',
  })
  const { data } = await fetchWP(`/wp/v2/posts?${q}`)
  return (data || []).map(entrada)
}

export async function getCategorias() {
  const { data } = await fetchWP('/wp/v2/categories?per_page=100&hide_empty=true&orderby=count&order=desc', { revalidate: 3600 })
  return (data || []).map(c => ({ id: c.id, slug: c.slug, nombre: c.name, total: c.count, descripcion: c.description }))
}

export async function getTermino(taxonomia, slug) {
  const { data } = await fetchWP(`/wp/v2/${taxonomia}?slug=${encodeURIComponent(slug)}`, { revalidate: 3600 })
  const t = data?.[0]
  return t ? { id: t.id, slug: t.slug, nombre: t.name, total: t.count, descripcion: t.description } : null
}

export async function getComentarios(postId) {
  const { data } = await fetchWP(`/wp/v2/comments?post=${postId}&per_page=100&order=asc`)
  return (data || []).map(c => ({
    id: c.id,
    padre: c.parent,
    autor: c.author_name,
    fecha: c.date,
    contenido: c.content?.rendered || '',
  }))
}

export async function getSitio() {
  const { data } = await fetchWP('/freemem/v1/sitio', { revalidate: 3600 })
  return {
    nombre: data?.nombre || 'La bitácora de FreeMEM by Francisco Tapias Bravo',
    descripcion: data?.descripcion || '',
    menu: data?.menu || [],
    paginas: data?.paginas || [],
    retrato: data?.retrato || null,
  }
}

/** Todas las direcciones para el mapa del sitio y el RSS */
export async function getTodas(tipo = 'posts') {
  const todas = []
  for (let pagina = 1; pagina < 50; pagina++) {
    const { data, paginas } = await fetchWP(`/wp/v2/${tipo}?per_page=100&page=${pagina}&_fields=id,slug,date,modified,title,excerpt,link`, { revalidate: 3600 })
    if (!data?.length) break
    todas.push(...data)
    if (pagina >= paginas) break
  }
  return todas
}
