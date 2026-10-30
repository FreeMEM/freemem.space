import Link from 'next/link'

export const metadata = { title: 'No encontrado' }

export default function NoEncontrado() {
  return (
    <section className="perdido">
      <div className="guru" role="status">
        <p>Software Failure. Press left mouse button to continue.</p>
        <p>Guru Meditation #00000404.0000F4EE</p>
      </div>
      <h1>Esta página no está</h1>
      <p>
        Puede que la entrada cambiara de nombre o que el enlace esté mal escrito. Busca en la bitácora o{' '}
        <Link href="/">vuelve a la portada</Link>.
      </p>
      <form className="busqueda busqueda--grande" action="/buscar/" role="search">
        <input type="search" name="q" placeholder="Buscar en la bitácora" aria-label="Buscar en la bitácora" />
      </form>
    </section>
  )
}
