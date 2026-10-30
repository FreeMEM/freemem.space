'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** El menú del blog, el mismo que tenía el WordPress antiguo */
export default function Temas({ enlaces }) {
  const actual = usePathname()
  return (
    <nav className="temas" aria-label="Menú">
      {enlaces.map(e => {
        const activo = e.ruta === '/' ? actual === '/' : actual.startsWith(e.ruta)
        return (
          <Link key={e.ruta} href={e.ruta} aria-current={activo ? 'page' : undefined}>
            {e.titulo}
          </Link>
        )
      })}
    </nav>
  )
}
