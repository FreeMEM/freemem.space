import FormularioComentario from './FormularioComentario'
import { formatoFecha, limpiar } from '@/lib/contenido'

export default function Comentarios({ postId, comentarios, abiertos }) {
  const raiz = comentarios.filter(c => !c.padre)
  const hijos = id => comentarios.filter(c => c.padre === id)

  const pintar = (c, respuesta = false) => (
    <div key={c.id}>
      <article className={`comentario${respuesta ? ' comentario--respuesta' : ''}`} id={`comentario-${c.id}`}>
        <header>
          <strong>{c.autor}</strong>
          <time dateTime={c.fecha}>{formatoFecha(c.fecha)}</time>
        </header>
        <div className="texto" dangerouslySetInnerHTML={{ __html: limpiar(c.contenido) }} />
      </article>
      {hijos(c.id).map(h => pintar(h, true))}
    </div>
  )

  return (
    <section className="comentarios" aria-labelledby="comentarios-titulo">
      <h2 id="comentarios-titulo">
        {comentarios.length === 0 ? 'Comentarios' : comentarios.length === 1 ? 'Un comentario' : `${comentarios.length} comentarios`}
      </h2>
      {raiz.map(c => pintar(c))}
      {abiertos && <FormularioComentario postId={postId} />}
    </section>
  )
}
