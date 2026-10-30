import Termino, { metaTermino } from '@/components/Termino'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return metaTermino('tags', slug)
}

export default async function EtiquetaN({ params }) {
  const { slug, n } = await params
  return <Termino taxonomia="tags" slug={slug} pagina={Number(n)} />
}
