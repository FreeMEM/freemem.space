/** JSON-LD para buscadores y modelos. El < se escapa para que no cierre el script. */
export default function DatosEstructurados({ datos }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }} />
}
