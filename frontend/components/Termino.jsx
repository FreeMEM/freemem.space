import { notFound } from 'next/navigation'
import Listado from './Listado'
import { getTermino } from '@/lib/wordpress'
import { textoPlano } from '@/lib/contenido'

const RUTAS = { categories: 'category', tags: 'tag' }

export async function metaTermino(taxonomia, slug) {
  const t = await getTermino(taxonomia, slug)
  return t ? { title: t.nombre, description: textoPlano(t.descripcion) || undefined } : {}
}

export default async function Termino({ taxonomia, slug, pagina = 1 }) {
  const t = await getTermino(taxonomia, slug)
  if (!t) notFound()
  const base = `/${RUTAS[taxonomia]}/${t.slug}/`
  const filtro = taxonomia === 'categories' ? { categoria: t.id } : { etiqueta: t.id }
  return (
    <Listado
      pagina={pagina}
      base={base}
      filtro={filtro}
      actual={taxonomia === 'categories' ? t.slug : undefined}
      cabeza={
        <header className="cabeza-seccion">
          <h1>{t.nombre}</h1>
          <p>
            {t.total === 1 ? 'Una entrada' : `${t.total} entradas`}
            {textoPlano(t.descripcion) ? `. ${textoPlano(t.descripcion)}` : ''}
          </p>
        </header>
      }
    />
  )
}
