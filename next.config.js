const { createSecureHeaders } = require('next-secure-headers');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'your-supabase-storage-domain.com'], // Añadido localhost para placeholders
  },
  experimental: {
    // Corregido: serverActions es un booleano
    serverActions: true,
    // Corregido: cambiado a serverExternalPackages
    serverExternalPackages: [],
  },
  // Asegúrate de que estas rutas estén gestionadas por Next.js
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Añadir cabeceras de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: createSecureHeaders({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "js.stripe.com"],
              imgSrc: ["'self'", 'data:', 'https://your-supabase-storage-domain.com', 'blob:'],
              connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://*.stripe.com'],
              frameSrc: ["'self'", 'https://*.stripe.com'],
              fontSrc: ["'self'", 'data:'],
              mediaSrc: ["'self'"],
              objectSrc: ["'none'"],
              manifestSrc: ["'self'"],
              workerSrc: ["'self'", 'blob:'],
              formAction: ["'self'"],
              baseUri: ["'self'"],
            },
          },
          // Habilitar protección XSS
          xssProtection: 'block-rendering',
          // Prevenir ataques de clickjacking
          frameGuard: 'deny',
          // Evitar que el navegador intente adivinar el tipo MIME
          nosniff: 'nosniff',
          // Forzar conexiones HTTPS
          forceHTTPSRedirect: process.env.NODE_ENV === 'production' ? [
            true,
            { maxAge: 60 * 60 * 24 * 365, includeSubDomains: true },
          ] : false,
          // Controlar referencias
          referrerPolicy: 'strict-origin-when-cross-origin',
        }),
      },
    ];
  },
};

module.exports = withPWA(nextConfig);