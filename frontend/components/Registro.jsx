import Link from 'next/link'
import { formatoDiaMes, resumen, textoPlano } from '@/lib/contenido'

function Apunte({ e }) {
  const href = `/${e.slug}/`
  return (
    <li className="apunte">
      {e.imagen && (
        <Link href={href} className="apunte__imagen" tabIndex={-1} aria-hidden="true">
          <img src={e.imagen.src} srcSet={e.imagen.srcset || undefined} sizes="(max-width: 960px) 100vw, 30vw" alt="" loading="lazy" decoding="async" />
        </Link>
      )}
      <div className="apunte__meta">
        <time dateTime={e.fecha}>{formatoDiaMes(e.fecha)}</time>
        {e.categorias.slice(0, 2).map(c => (
          <span key={c.id}>{c.nombre}</span>
        ))}
      </div>
      <h3>
        <Link href={href}>{textoPlano(e.titulo)}</Link>
      </h3>
      <p>{resumen(e.extracto)}</p>
    </li>
  )
}

/** Las entradas agrupadas por año, como las hojas de una bitácora */
export default function Registro({ entradas }) {
  const porAnio = []
  for (const e of entradas) {
    const anio = new Date(e.fecha).getFullYear()
    const ultimo = porAnio[porAnio.length - 1]
    if (ultimo?.anio === anio) ultimo.entradas.push(e)
    else porAnio.push({ anio, entradas: [e] })
  }
  return porAnio.map(({ anio, entradas }) => (
    <section className="anio" key={anio} aria-labelledby={`anio-${anio}`}>
      <h2 id={`anio-${anio}`}>{anio}</h2>
      <ol className="registro">
        {entradas.map(e => (
          <Apunte key={e.id} e={e} />
        ))}
      </ol>
    </section>
  ))
}
