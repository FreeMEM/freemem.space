import { getCategorias, getSitio, getTodasCompletas, SITE_URL } from '@/lib/wordpress'
import { lineaIndice, cabeceraMarkdown } from '@/lib/markdown'
import { textoPlano } from '@/lib/contenido'

/** Índice del sitio para modelos de lenguaje (https://llmstxt.org) */
export async function GET() {
  const [sitio, entradas, paginas, categorias] = await Promise.all([
    getSitio(),
    getTodasCompletas('posts'),
    getTodasCompletas('pages'),
    getCategorias(),
  ])
  const porTema = categorias
    .filter(c => c.slug !== 'portada')
    .map(c => {
      const suyas = entradas.filter(e => e.categorias[0]?.id === c.id)
      return suyas.length ? `## ${c.nombre}\n\n${suyas.map(lineaIndice).join('\n')}` : ''
    })
    .filter(Boolean)
  const sinTema = entradas.filter(e => !e.categorias.length || e.categorias[0].slug === 'portada')
  const texto = `# ${sitio.nombre}

> ${textoPlano(sitio.descripcion)}. Blog personal de Francisco Tapias Bravo (FreeMEM), en español, con entradas desde 2004: Amiga y retroinformática, programación (Dash, un lenguaje para AmigaOS), administración de sistemas GNU/Linux, robótica, software libre y derechos digitales.

Cada entrada tiene su versión en Markdown en la misma dirección terminada en \`index.md\`. Todo el texto junto está en ${SITE_URL}/llms-full.txt. Las entradas anteriores a 2006 se rescataron de old.tapiasbravo.com y algunas las escribieron otras personas: lo indica cada una.

${porTema.join('\n\n')}
${sinTema.length ? `\n## Otras entradas\n\n${sinTema.map(lineaIndice).join('\n')}\n` : ''}
## Páginas

${paginas.map(lineaIndice).join('\n')}

## Optional

- [RSS](${SITE_URL}/feed/): las últimas entradas
- [Mapa del sitio](${SITE_URL}/sitemap.xml)
- [Código de esta web](https://github.com/FreeMEM/freemem.space)
`
  return new Response(texto, { headers: cabeceraMarkdown })
}
