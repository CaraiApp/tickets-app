import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rutas que requieren autenticación
  const protectedRoutes = [
    '/dashboard',
    '/empleados',
    '/tickets',
    '/editar'
  ];
  
  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );
  
  // Si la ruta está protegida y no hay sesión, redirigir al login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Si el usuario ya está autenticado y va a login/register, redirigir al dashboard
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Verificar autorización para rutas específicas de empleados
  if (session && /^\/empleados\/(\d+)/.test(req.nextUrl.pathname)) {
    try {
      // Obtener el ID del empleado de la URL
      const empleadoId = req.nextUrl.pathname.split('/')[2];

      // Obtener el perfil del usuario actual
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      // Verificar si el empleado pertenece a la organización del usuario
      const { data: empleado, error: empleadoError } = await supabase
        .from('empleados')
        .select('organization_id')
        .eq('id', empleadoId)
        .single();

      if (empleadoError) throw empleadoError;

      // Si no coinciden las organizaciones, redirigir al dashboard
      if (empleado.organization_id !== userProfile.organization_id) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    } catch (error) {
      console.error('Error de autorización:', error);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

export const config = {
  // Matcher para las rutas que queremos procesar
  matcher: [
    '/dashboard/:path*', 
    '/tickets/:path*',
    '/empleados/:path*',
    '/editar/:path*',
    '/login',
    '/register',
    '/api/:path*'
  ],
};