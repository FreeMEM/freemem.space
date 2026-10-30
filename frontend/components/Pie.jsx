import Link from 'next/link'
import { textoPlano } from '@/lib/contenido'

export default function Pie({ sitio, categorias }) {
  return (
    <footer className="pie">
      <div>
        <h2>{sitio.nombre}</h2>
        <p>{textoPlano(sitio.descripcion)}. Lo escribe Francisco Tapias Bravo desde 2006.</p>
      </div>
      <div>
        <h2>Temas</h2>
        <ul>
          {categorias.filter(c => c.slug !== 'portada').slice(0, 8).map(c => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}/`}>{c.nombre}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>El sitio</h2>
        <ul>
          <li><Link href="/la-bitacora-de-freemem/">Acerca de FreeMEM</Link></li>
          <li><Link href="/curriculum-vitae/">Currículum</Link></li>
          <li><a href="https://github.com/FreeMEM">GitHub</a></li>
          <li><a href="/feed/">RSS</a></li>
          <li><Link href="/aviso-legal/">Aviso legal</Link></li>
          <li><Link href="/politica-de-privacidad/">Privacidad</Link></li>
          <li><Link href="/politica-de-cookies/">Cookies</Link></li>
        </ul>
      </div>
    </footer>
  )
}
