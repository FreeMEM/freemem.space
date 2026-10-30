import Link from 'next/link'

/** Más recientes a la izquierda, más antiguas a la derecha */
export default function Paginas({ base, pagina, paginas }) {
  if (paginas <= 1) return null
  // La búsqueda pagina con ?pagina=; el resto, con /page/N/ como el blog antiguo
  const ir = base.includes('?')
    ? n => `${base}pagina=${n}`
    : n => (n === 1 ? base : `${base}page/${n}/`)
  return (
    <nav className="paginas" aria-label="Páginas">
      {pagina > 1 ? <Link href={ir(pagina - 1)}>Más recientes</Link> : <span />}
      <span>
        Página {pagina} de {paginas}
      </span>
      {pagina < paginas ? <Link href={ir(pagina + 1)}>Más antiguas</Link> : <span />}
    </nav>
  )
}
