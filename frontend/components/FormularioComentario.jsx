'use client'

import { useState } from 'react'

/**
 * Los comentarios van a la API de WordPress y quedan pendientes de moderación:
 * no se ven hasta que se aprueban en wp-admin.
 */
export default function FormularioComentario({ postId }) {
  const [estado, setEstado] = useState('listo')
  const [error, setError] = useState('')

  async function enviar(ev) {
    ev.preventDefault()
    const datos = new FormData(ev.currentTarget)
    if (datos.get('web_alternativa')) return // trampa para robots
    setEstado('enviando')
    setError('')
    try {
      const res = await fetch('/wp-json/wp/v2/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post: postId,
          author_name: datos.get('nombre'),
          author_email: datos.get('correo'),
          content: datos.get('comentario'),
        }),
      })
      if (!res.ok) {
        const r = await res.json().catch(() => ({}))
        throw new Error(r.code === 'comment_duplicate' ? 'Ese comentario ya está enviado.' : 'No se ha podido enviar. Revisa los campos e inténtalo de nuevo.')
      }
      ev.target.reset()
      setEstado('enviado')
    } catch (e) {
      setError(e.message)
      setEstado('listo')
    }
  }

  if (estado === 'enviado') {
    return <p className="vacio">Comentario recibido. Aparecerá aquí cuando lo apruebe.</p>
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h3>Deja un comentario</h3>
      <label>
        Nombre
        <input name="nombre" required maxLength={80} autoComplete="name" />
      </label>
      <label>
        Correo (no se publica)
        <input name="correo" type="email" required maxLength={120} autoComplete="email" />
      </label>
      <label className="ancho">
        Comentario
        <textarea name="comentario" required maxLength={5000} />
      </label>
      <label className="trampa" aria-hidden="true">
        No rellenar
        <input name="web_alternativa" tabIndex={-1} autoComplete="off" />
      </label>
      {error && <p role="alert">{error}</p>}
      <p>
        Los comentarios se moderan antes de publicarse. Tu correo solo sirve para contestarte: más en la{' '}
        <a href="/politica-de-privacidad/">política de privacidad</a>.
      </p>
      <button className="boton" type="submit" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? 'Enviando…' : 'Enviar comentario'}
      </button>
    </form>
  )
}
