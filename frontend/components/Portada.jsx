import Image from 'next/image'
import Link from 'next/link'
import { formatoFecha, resumen, textoPlano } from '@/lib/contenido'

/** La última entrada a toda pantalla, sobre las copper bars */
export default function Portada({ entrada }) {
  const href = `/${entrada.slug}/`
  return (
    <section className={`portada${entrada.imagen ? '' : ' portada--sin-imagen'}`} aria-labelledby="portada-titulo">
      <div className="portada__texto">
        <p className="portada__fecha">
          <time dateTime={entrada.fecha}>{formatoFecha(entrada.fecha)}</time>
          {entrada.categorias[0] && <> en {entrada.categorias[0].nombre}</>}
        </p>
        <h1 id="portada-titulo">
          <Link href={href}>{textoPlano(entrada.titulo)}</Link>
        </h1>
        <p className="portada__resumen">{resumen(entrada.extracto, 260)}</p>
      </div>
      {entrada.imagen && (
        <figure className="portada__imagen">
          {/* En móvil la imagen va arriba y es lo primero que se toca. Fuera del
              tabulador y del lector: el enlace del título ya lleva al mismo sitio. */}
          <Link href={href} tabIndex={-1} aria-hidden="true">
            <Image
              src={entrada.imagen.src}
              sizes="(max-width: 860px) 100vw, 42vw"
              alt={entrada.imagen.alt}
              width={entrada.imagen.ancho}
              height={entrada.imagen.alto}
              priority
              fetchPriority="high"
              loading="eager"
            />
          </Link>
        </figure>
      )}
      <div className="cobre" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
    </section>
  )
}
