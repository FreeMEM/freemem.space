import Image from 'next/image'
import Link from 'next/link'

export default function Lateral({ sitio, categorias, actual }) {
  return (
    <aside className="lateral" aria-label="Sobre la bitácora">
      {sitio.retrato && (
        <figure className="retrato">
          <Image src={sitio.retrato.src} width={sitio.retrato.ancho} height={sitio.retrato.alto} sizes="(max-width: 960px) 22rem, 20vw" alt="Un ojo pintado, la imagen de FreeMEM" />
        </figure>
      )}
      <h2>FreeMEM</h2>
      <p>
        Apuntes de Francisco Tapias Bravo sobre el Amiga, programación, sistemas y conocimiento libre, desde 2004.{' '}
        <Link href="/la-bitacora-de-freemem/">Más sobre mí</Link>.
      </p>
      <h2>Temas</h2>
      <ul className="lista-temas">
        {categorias.map(c => (
          <li key={c.id}>
            <Link href={`/category/${c.slug}/`} aria-current={actual === c.slug ? 'page' : undefined}>
              {c.nombre}
            </Link>
            <span>{c.total}</span>
          </li>
        ))}
      </ul>
      {sitio.paginas.length > 0 && (
        <>
          <h2>Páginas</h2>
          <ul className="lista-temas">
            {sitio.paginas.map(p => (
              <li key={p.ruta}>
                <Link href={p.ruta}>{p.titulo}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
