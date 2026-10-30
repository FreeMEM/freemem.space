import { getSitio, getTodasCompletas } from '@/lib/wordpress'
import { aMarkdown, cabeceraMarkdown } from '@/lib/markdown'
import { textoPlano } from '@/lib/contenido'

/** Todo el blog en un solo Markdown, de lo más nuevo a lo más antiguo */
export async function GET() {
  const [sitio, entradas, paginas] = await Promise.all([getSitio(), getTodasCompletas('posts'), getTodasCompletas('pages')])
  const partes = [`# ${sitio.nombre}\n\n> ${textoPlano(sitio.descripcion)}\n`, ...paginas.map(aMarkdown), ...entradas.map(aMarkdown)]
  return new Response(partes.join('\n---\n\n'), { headers: cabeceraMarkdown })
}
