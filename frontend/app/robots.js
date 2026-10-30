import { SITE_URL } from '@/lib/wordpress'

// Buscadores y rastreadores de IA son bienvenidos: el blog es para leerlo.
// Para ellos están también /llms.txt y la versión .md de cada entrada.
const PRIVADO = ['/wp-admin/', '/wp-login.php', '/buscar/']

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVADO },
      { userAgent: ['GPTBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'], allow: '/', disallow: PRIVADO },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
