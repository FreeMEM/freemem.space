/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone para Docker
  output: 'standalone',
  // Las direcciones del blog antiguo terminan en barra (/%postname%/): se conservan
  // tal cual para no romper enlaces ni lo que tenga indexado Google.
  trailingSlash: true,
  poweredByHeader: false,
  // Comprime nginx (también lo cacheado); comprimir dos veces solo gasta CPU
  compress: false,
  // 6 KB de CSS: dentro del HTML se ahorra una petición que bloquea el primer pintado
  experimental: { inlineCss: true },
  // Las imágenes de WordPress (PNG y JPG de hasta 2 MB) salen en AVIF o WebP y al
  // tamaño de cada pantalla. El optimizador las pide a https://freemem.space, que
  // dentro del CT apunta al propio nginx (extra_hosts en docker-compose.prod.yml).
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'freemem.space', pathname: '/wp-content/uploads/**' },
      ...(process.env.NODE_ENV === 'production'
        ? []
        : [{ protocol: 'http', hostname: 'localhost', port: '8080', pathname: '/wp-content/uploads/**' }]),
    ],
    formats: ['image/avif', 'image/webp'],
    // Solo una calidad: con cualquiera, alguien podría llenar la caché de variantes
    qualities: [75],
    minimumCacheTTL: 2592000,
  },
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
