import Link from 'next/link'

export default function Lateral({ categorias, actual }) {
  return (
    <aside className="lateral" aria-label="Temas de la bitácora">
      <h2>Qué hay aquí</h2>
      <p>
        Apuntes de Francisco Tapias Bravo sobre el Amiga, programación, sistemas y conocimiento libre.
        Algunos tienen casi veinte años: se quedan como estaban.
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
    </aside>
  )
}
