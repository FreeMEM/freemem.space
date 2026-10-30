/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone para Docker
  output: 'standalone',
  // Las direcciones del blog antiguo terminan en barra (/%postname%/): se conservan
  // tal cual para no romper enlaces ni lo que tenga indexado Google.
  trailingSlash: true,
  poweredByHeader: false,
  // En desarrollo el formulario de comentarios llama a /wp-json/ del propio
  // frontend; en producción eso lo enruta nginx.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return []
    const api = process.env.WORDPRESS_API_URL || 'http://localhost:8080/wp-json'
    return [{ source: '/wp-json/:ruta*', destination: `${api}/:ruta*` }]
  },
  async redirects() {
    return [
      { source: '/author/:slug*', destination: '/', permanent: true },
      { source: '/comments/feed', destination: '/feed/', permanent: true },
      { source: '/wp-sitemap.xml', destination: '/sitemap.xml', permanent: true },
    ]
  },
}

export default nextConfig
