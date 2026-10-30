import Link from 'next/link'
import Temas from './Temas'

export default function Cabecera({ categorias }) {
  return (
    <header className="cabecera">
      <Link href="/" className="marca">
        FreeMEM <span>bitácora</span>
      </Link>
      <Temas categorias={categorias.slice(0, 7)} />
      <form className="busqueda" action="/buscar/" role="search">
        <input type="search" name="q" placeholder="Buscar en la bitácora" aria-label="Buscar en la bitácora" />
      </form>
    </header>
  )
}
