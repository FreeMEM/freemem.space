import Link from 'next/link'
import { notFound } from 'next/navigation'
import Comentarios from '@/components/Comentarios'
import DatosEstructurados from '@/components/DatosEstructurados'
import { getComentarios, getPorSlug, getRelacionadas, SITE_URL } from '@/lib/wordpress'
import { formatoFecha, minutosLectura, prepararContenido, resumen, textoPlano } from '@/lib/contenido'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const e = await getPorSlug(slug)
  if (!e) return {}
  const descripcion = resumen(e.extracto || e.contenido, 160)
  return {
    title: textoPlano(e.titulo),
    description: descripcion,
    alternates: {
      canonical: `${SITE_URL}/${e.slug}/`,
      types: { 'text/markdown': `${SITE_URL}/${e.slug}/index.md` },
    },
    openGraph: {
      type: e.tipo === 'post' ? 'article' : 'website',
      title: textoPlano(e.titulo),
      description: descripcion,
      publishedTime: e.fecha,
      modifiedTime: e.modificada,
      authors: [e.autor],
      tags: e.etiquetas.map(t => t.nombre),
      images: e.imagen ? [{ url: e.imagen.src, width: e.imagen.ancho, height: e.imagen.alto }] : undefined,
    },
    twitter: { card: e.imagen ? 'summary_large_image' : 'summary' },
  }
}

export default async function Entrada({ params }) {
  const { slug } = await params
  const e = await getPorSlug(decodeURIComponent(slug))
  if (!e) notFound()

  const esEntrada = e.tipo === 'post'
  // El currículum lo pinta el plugin Resume Builder: necesita el ancho entero
  const esCurriculum = e.contenido.includes('rb-template-container')
  const { html, indice } = prepararContenido(e.contenido)
  const [relacionadas, comentarios] = await Promise.all([
    esEntrada ? getRelacionadas(e) : [],
    esEntrada ? getComentarios(e.id) : [],
  ])

  const url = `${SITE_URL}/${e.slug}/`
  const ld = esEntrada && {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: textoPlano(e.titulo),
    description: resumen(e.extracto || e.contenido, 200),
    datePublished: e.fecha,
    dateModified: e.modificada || e.fecha,
    url,
    mainEntityOfPage: url,
    inLanguage: 'es-ES',
    author: { '@type': 'Person', name: e.autor, url: `${SITE_URL}/la-bitacora-de-freemem/` },
    publisher: { '@type': 'Person', name: 'Francisco Tapias Bravo', url: SITE_URL },
    image: e.imagen?.src,
    articleSection: e.categorias.map(c => c.nombre),
    keywords: e.etiquetas.map(t => t.nombre).join(', ') || undefined,
    wordCount: textoPlano(e.contenido).split(' ').length,
    encoding: { '@type': 'MediaObject', encodingFormat: 'text/markdown', contentUrl: `${url}index.md` },
  }

  return (
    <article>
      {ld && <DatosEstructurados datos={ld} />}
      <header className="cabeza-entrada">
        {esEntrada && (
          <p className="cabeza-entrada__meta">
            <time dateTime={e.fecha}>{formatoFecha(e.fecha)}</time>
            <span>{minutosLectura(e.contenido)} min de lectura</span>
            {e.categorias.map(c => (
              <Link key={c.id} href={`/category/${c.slug}/`}>
                {c.nombre}
              </Link>
            ))}
          </p>
        )}
        <h1>{textoPlano(e.titulo)}</h1>
      </header>

      {e.imagen && (
        <figure className="imagen-entrada">
          <img
            src={e.imagen.src}
            srcSet={e.imagen.srcset || undefined}
            sizes="100vw"
            alt={e.imagen.alt}
            width={e.imagen.ancho}
            height={e.imagen.alto}
            fetchPriority="high"
          />
        </figure>
      )}

      <div className="cuerpo-entrada">
        <nav className="indice" aria-label="Índice de la entrada">
          {indice.length > 2 && (
            <>
              <h2>En esta entrada</h2>
              <ol>
                {indice.map(h => (
                  <li key={h.id} className={`n${h.nivel}`}>
                    <a href={`#${h.id}`}>{h.texto}</a>
                  </li>
                ))}
              </ol>
            </>
          )}
        </nav>

        <div className={`texto${esCurriculum ? ' texto--cv' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />

        <aside className="al-lado" aria-label="Más de la bitácora">
          {relacionadas.length > 0 && (
            <>
              <h2>Del mismo tema</h2>
              <ul>
                {relacionadas.map(r => (
                  <li key={r.id}>
                    <Link href={`/${r.slug}/`}>{textoPlano(r.titulo)}</Link>
                    <small>{formatoFecha(r.fecha)}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
          {e.etiquetas.length > 0 && (
            <>
              <h2>Etiquetas</h2>
              <div className="etiquetas">
                {e.etiquetas.map(t => (
                  <Link key={t.id} href={`/tag/${t.slug}/`}>
                    {t.nombre}
                  </Link>
                ))}
              </div>
            </>
          )}
        </aside>

        {esEntrada && (comentarios.length > 0 || e.comentariosAbiertos) && (
          <Comentarios postId={e.id} comentarios={comentarios} abiertos={e.comentariosAbiertos} />
        )}
      </div>
    </article>
  )
}
