import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'

/**
 * WordPress avisa aquí al publicar o moderar (mu-plugin freemem-headless), por la
 * red interna. Desde fuera nginx devuelve 404 a todo /api/.
 */
function secretoValido(recibido) {
  const secreto = process.env.REVALIDATE_SECRET || ''
  if (!secreto || !recibido) return false
  const a = Buffer.from(String(recibido))
  const b = Buffer.from(secreto)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req) {
  if (!secretoValido(req.headers.get('x-revalidate-secret'))) {
    return Response.json({ ok: false }, { status: 401 })
  }
  revalidateTag('wp')
  return Response.json({ ok: true })
}
