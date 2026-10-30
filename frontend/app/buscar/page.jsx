import Listado from '@/components/Listado'

export const metadata = { title: 'Buscar', robots: { index: false } }

export default async function Buscar({ searchParams }) {
  const { q = '', pagina } = await searchParams
  const texto = String(q).slice(0, 100).trim()
  return (
    <Listado
      pagina={Number(pagina || 1)}
      base={`/buscar/?q=${encodeURIComponent(texto)}&`}
      filtro={{ buscar: texto || undefined }}
      cabeza={
        <header className="cabeza-seccion">
          <h1>{texto ? `Buscar “${texto}”` : 'Buscar'}</h1>
        </header>
      }
    />
  )
}
