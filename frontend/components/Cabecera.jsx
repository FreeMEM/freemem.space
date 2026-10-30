import Link from 'next/link'
import Temas from './Temas'

/** «La bitácora de FreeMEM by Francisco Tapias Bravo»: la firma va aparte y más fina */
function Marca({ nombre }) {
  const [titulo, firma] = nombre.split(/\s+(?=by\s)/)
  return (
    <Link href="/" className="marca">
      {titulo}
      {firma && <span> {firma}</span>}
    </Link>
  )
}

export default function Cabecera({ sitio }) {
  return (
    <header className="cabecera">
      <div className="cabecera__marca">
        <Marca nombre={sitio.nombre} />
        {sitio.descripcion && <p className="lema">{sitio.descripcion}</p>}
      </div>
      <Temas enlaces={sitio.menu} />
      <form className="busqueda" action="/buscar/" role="search">
        <input type="search" name="q" placeholder="Buscar en la bitácora" aria-label="Buscar en la bitácora" />
      </form>
    </header>
  )
}
