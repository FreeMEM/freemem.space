'use client'

export default function EnlaceCookies() {
  return (
    <button type="button" className="enlace-boton" onClick={() => window.dispatchEvent(new Event('freemem:cookies'))}>
      Cambiar las cookies
    </button>
  )
}
