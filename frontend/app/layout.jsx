import { Bricolage_Grotesque, Literata, JetBrains_Mono } from 'next/font/google'
import Cabecera from '@/components/Cabecera'
import Pie from '@/components/Pie'
import { getCategorias, getSitio, SITE_URL } from '@/lib/wordpress'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bricolage' })
const literata = Literata({ subsets: ['latin'], display: 'swap', variable: '--font-literata' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains' })

export async function generateMetadata() {
  const sitio = await getSitio()
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: sitio.nombre, template: `%s | ${sitio.nombre}` },
    description: sitio.descripcion,
    alternates: { types: { 'application/rss+xml': `${SITE_URL}/feed/` } },
    twitter: { card: 'summary' },
    openGraph: { siteName: sitio.nombre, locale: 'es_ES', type: 'website' },
  }
}

// Las páginas se generan al pedirlas (la API no está a mano al construir la
// imagen); lo que se cachea son las respuestas de WordPress, etiquetadas «wp».
export const dynamic = 'force-dynamic'

export const viewport = {
  themeColor: '#0055aa',
}

export default async function RootLayout({ children }) {
  const [sitio, categorias] = await Promise.all([getSitio(), getCategorias()])
  return (
    <html lang="es" className={`${bricolage.variable} ${literata.variable} ${jetbrains.variable}`}>
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <Cabecera sitio={sitio} />
        <main id="contenido">{children}</main>
        <Pie sitio={sitio} categorias={categorias} />
      </body>
    </html>
  )
}
