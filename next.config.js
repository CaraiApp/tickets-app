/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'your-supabase-storage-domain.com'], // Añadido localhost para placeholders
  },
  experimental: {
    // Habilitar estas opciones para mejor rendimiento
    serverActions: true,
    serverComponentsExternalPackages: [],
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
};

module.exports = withPWA(nextConfig);