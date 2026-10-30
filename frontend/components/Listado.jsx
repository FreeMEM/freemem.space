import { notFound } from 'next/navigation'
import Lateral from './Lateral'
import Registro from './Registro'
import Paginas from './Paginas'
import Portada from './Portada'
import { getCategorias, getEntradas, getSitio } from '@/lib/wordpress'

/**
 * Portada, categorías, etiquetas y búsqueda comparten esta vista. En la primera
 * página de la portada la entrada más reciente se lleva la pantalla entera.
 */
export default async function Listado({ pagina = 1, base = '/', filtro = {}, cabeza = null, actual, conPortada = false }) {
  if (!Number.isInteger(pagina) || pagina < 1) notFound()
  const [{ entradas, paginas }, categorias, sitio] = await Promise.all([getEntradas({ pagina, ...filtro }), getCategorias(), getSitio()])
  if (pagina > 1 && !entradas.length) notFound()

  const destacada = conPortada && pagina === 1 ? entradas[0] : null
  const resto = destacada ? entradas.slice(1) : entradas

  return (
    <>
      {destacada && <Portada entrada={destacada} />}
      <div className="lienzo">
        <Lateral sitio={sitio} categorias={categorias} actual={actual} />
        <div>
          {cabeza}
          {resto.length ? (
            <Registro entradas={resto} />
          ) : (
            !destacada && <p className="vacio">No hay entradas que coincidan. Prueba con otras palabras o mira los temas de la izquierda.</p>
          )}
          <Paginas base={base} pagina={pagina} paginas={paginas} />
        </div>
      </div>
    </>
  )
}
