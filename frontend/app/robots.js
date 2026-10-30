import { SITE_URL } from '@/lib/wordpress'

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/wp-admin/', '/wp-login.php', '/buscar/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
