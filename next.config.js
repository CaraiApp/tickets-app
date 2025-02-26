/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Si necesitas configuraciones de imagen
  images: {
    domains: ['your-supabase-storage-domain.com'], // Ajusta según tus necesidades
  }
};

module.exports = nextConfig;