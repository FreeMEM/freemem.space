'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Temas({ categorias }) {
  const ruta = usePathname()
  return (
    <nav className="temas" aria-label="Temas">
      {categorias.map(c => {
        const href = `/category/${c.slug}/`
        return (
          <Link key={c.id} href={href} aria-current={ruta.startsWith(href) ? 'page' : undefined}>
            {c.nombre}
          </Link>
        )
      })}
    </nav>
  )
}
