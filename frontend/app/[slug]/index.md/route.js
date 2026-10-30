import { getPorSlug } from '@/lib/wordpress'
import { aMarkdown, cabeceraMarkdown } from '@/lib/markdown'

export async function GET(_req, { params }) {
  const { slug } = await params
  const e = await getPorSlug(decodeURIComponent(slug))
  if (!e) return new Response('No existe esa entrada.\n', { status: 404, headers: cabeceraMarkdown })
  return new Response(aMarkdown(e), { headers: cabeceraMarkdown })
}
