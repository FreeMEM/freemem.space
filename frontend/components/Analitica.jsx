'use client'

import { useEffect, useState } from 'react'

/**
 * Google Analytics 4 solo con permiso. Hasta que el visitante acepta no se carga
 * nada de Google: ni el script ni cookies. Rechazar cuesta lo mismo que aceptar,
 * y el enlace «Cookies» del pie vuelve a abrir el aviso (evento freemem:cookies).
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const CLAVE = 'freemem-cookies'

function leer() {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

function cargarGoogle() {
  if (!GA_ID || window.gtag) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { anonymize_ip: true })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

function borrarCookiesGoogle() {
  for (const c of document.cookie.split(';')) {
    const nombre = c.split('=')[0].trim()
    if (nombre.startsWith('_ga')) {
      for (const dominio of [location.hostname, `.${location.hostname}`]) {
        document.cookie = `${nombre}=; Max-Age=0; path=/; domain=${dominio}`
      }
    }
  }
}

export default function Analitica() {
  const [preguntar, setPreguntar] = useState(false)

  useEffect(() => {
    const decision = leer()
    if (decision === 'si') cargarGoogle()
    if (!decision && GA_ID) setPreguntar(true)
    const abrir = () => setPreguntar(true)
    window.addEventListener('freemem:cookies', abrir)
    return () => window.removeEventListener('freemem:cookies', abrir)
  }, [])

  function decidir(si) {
    try {
      localStorage.setItem(CLAVE, si ? 'si' : 'no')
    } catch {}
    setPreguntar(false)
    if (si) cargarGoogle()
    else if (window.gtag) {
      // Ya estaba cargado: se borran sus cookies y deja de medir al recargar
      borrarCookiesGoogle()
      location.reload()
    }
  }

  if (!preguntar) return null
  return (
    <div className="aviso-cookies" role="dialog" aria-labelledby="aviso-cookies-titulo" aria-live="polite">
      <p id="aviso-cookies-titulo">
        <strong>¿Me dejas contar las visitas?</strong> Uso Google Analytics para saber qué se lee. Solo se activa si aceptas.{' '}
        <a href="/politica-de-cookies/">Política de cookies</a>.
      </p>
      <div>
        <button className="boton" onClick={() => decidir(true)}>
          Aceptar
        </button>
        <button className="boton" onClick={() => decidir(false)}>
          Rechazar
        </button>
      </div>
    </div>
  )
}
