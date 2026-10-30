import Listado from '@/components/Listado'

export async function generateMetadata({ params }) {
  const { n } = await params
  return { title: `Página ${n}` }
}

export default async function PaginaN({ params }) {
  const { n } = await params
  return <Listado pagina={Number(n)} />
}
