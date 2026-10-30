import Termino, { metaTermino } from '@/components/Termino'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return metaTermino('categories', slug)
}

export default async function Categoria({ params }) {
  const { slug } = await params
  return <Termino taxonomia="categories" slug={slug} />
}
