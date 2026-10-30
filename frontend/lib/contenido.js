/**
 * Tratamiento del HTML que llega de WordPress antes de pintarlo.
 *
 * Se limpia siempre con DOMPurify aunque venga de nuestro propio WordPress: tras la
 * intrusión de 2026 la base es lo primero que alguien tocaría para colar un script.
 */

import DOMPurify from 'isomorphic-dompurify'

const IFRAMES_PERMITIDOS = /^https:\/\/(www\.youtube-nocookie\.com|www\.youtube\.com|player\.vimeo\.com)\//

DOMPurify.addHook('uponSanitizeElement', (nodo, datos) => {
  if (datos.tagName === 'iframe' && !IFRAMES_PERMITIDOS.test(nodo.getAttribute?.('src') || '')) {
    nodo.parentNode?.removeChild(nodo)
  }
})

DOMPurify.addHook('afterSanitizeAttributes', nodo => {
  // Enlaces a otros sitios: en pestaña nueva y sin pasarles quién los envía
  if (nodo.tagName === 'A' && /^https?:\/\//.test(nodo.getAttribute('href') || '') && !nodo.getAttribute('href').includes('freemem.space')) {
    nodo.setAttribute('target', '_blank')
    nodo.setAttribute('rel', 'noopener noreferrer')
  }
  if (nodo.tagName === 'IMG') {
    nodo.setAttribute('loading', 'lazy')
    nodo.setAttribute('decoding', 'async')
  }
})

export function limpiar(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target', 'loading'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
  })
}

/** [youtube https://…] y [youtube id=…] del blog antiguo, sin plugin que los pinte */
function youtube(html) {
  return html.replace(/\[youtube[^\]]*?(?:v=|youtu\.be\/|id=["']?|\s)([A-Za-z0-9_-]{11})[^\]]*\](?:\s*\[\/youtube\])?/g, (_, id) =>
    `<figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vídeo de YouTube" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></figure>`
  )
}

function slugTitulo(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/**
 * Devuelve el HTML listo y el índice de sus h2 y h3. Los encabezados reciben un id
 * para poder enlazarlos desde el índice.
 */
export function prepararContenido(html) {
  const indice = []
  const usados = new Set()
  const listo = limpiar(youtube(html || '')).replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (todo, nivel, attrs, dentro) => {
    const texto = textoPlano(dentro)
    if (!texto) return todo
    let id = /id="([^"]+)"/.exec(attrs)?.[1] || slugTitulo(texto) || `seccion-${indice.length + 1}`
    while (usados.has(id)) id += '-'
    usados.add(id)
    indice.push({ id, texto, nivel: Number(nivel) })
    return `<h${nivel}${attrs.replace(/\sid="[^"]*"/, '')} id="${id}">${dentro}</h${nivel}>`
  })
  return { html: listo, indice }
}

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”', '&#8211;': '–', '&#8212;': '—', '&#8230;': '…', '&nbsp;': ' ', '&hellip;': '…' }

export function textoPlano(html) {
  return (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#?[a-z0-9]+;/gi, e => ENTIDADES[e] ?? (e.startsWith('&#') ? String.fromCodePoint(parseInt(e.slice(2), 10) || 32) : e))
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resumen(html, max = 220) {
  const t = textoPlano(html).replace(/\s*(Leer más|Seguir leyendo|Continue reading).*$/i, '')
  return t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t
}

const fechaLarga = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
const fechaCorta = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

export const formatoFecha = f => fechaLarga.format(new Date(f))
export const formatoDiaMes = f => fechaCorta.format(new Date(f)).replace('.', '')

export function minutosLectura(html) {
  return Math.max(1, Math.round(textoPlano(html).split(' ').length / 220))
}
