/**
 * Versión en Markdown de las entradas, para quien lee el blog con una IA:
 * /<slug>/index.md, /llms.txt y /llms-full.txt.
 */

import TurndownService from 'turndown'
import { formatoFecha, prepararContenido, resumen, textoPlano } from './contenido'
import { SITE_URL } from './wordpress'

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' })
td.remove(['figure.video', 'iframe'])
td.addRule('video', {
  filter: n => n.nodeName === 'FIGURE' && n.classList?.contains('video'),
  replacement: (_, n) => {
    const src = n.querySelector('iframe')?.getAttribute('src') || ''
    const id = src.split('/embed/')[1]
    return id ? `\n\n[Vídeo de YouTube](https://www.youtube.com/watch?v=${id})\n\n` : ''
  },
})

export function aMarkdown(e) {
  const { html } = prepararContenido(e.contenido)
  const url = `${SITE_URL}/${e.slug}/`
  const meta = [
    `- Dirección: ${url}`,
    e.tipo === 'post' && `- Publicada: ${formatoFecha(e.fecha)}`,
    e.categorias?.length && `- Temas: ${e.categorias.map(c => c.nombre).join(', ')}`,
    e.etiquetas?.length && `- Etiquetas: ${e.etiquetas.map(t => t.nombre).join(', ')}`,
    `- Autor: ${e.autor}`,
  ].filter(Boolean)
  return `# ${textoPlano(e.titulo)}\n\n${meta.join('\n')}\n\n${td.turndown(html).trim()}\n`
}

export function lineaIndice(e) {
  const r = resumen(e.extracto || e.contenido, 160)
  return `- [${textoPlano(e.titulo)}](${SITE_URL}/${e.slug}/index.md)${r ? `: ${r}` : ''}`
}

export const cabeceraMarkdown = { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=600' }
