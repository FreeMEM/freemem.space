import { revalidateTag } from 'next/cache'

/** WordPress avisa aquí al publicar o moderar (mu-plugin freemem-headless) */
export async function POST(req) {
  const secreto = process.env.REVALIDATE_SECRET
  if (!secreto || req.headers.get('x-revalidate-secret') !== secreto) {
    return Response.json({ ok: false }, { status: 401 })
  }
  revalidateTag('wp')
  return Response.json({ ok: true })
}
