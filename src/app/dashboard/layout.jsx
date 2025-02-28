'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Obtener información del usuario
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUser({
            ...session.user,
            firstName: profile.first_name,
            lastName: profile.last_name,
            role: profile.role
          });
        } else {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Menú de navegación
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🎫' },
    { path: '/estadisticas', label: 'Estadísticas', icon: '📊' },
    { path: '/empleados2', label: 'Empleados', icon: '👥' },
    { path: '/dashboard/settings', label: 'Configuración', icon: '⚙️' }
  ];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar para desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Ticket Lucrapp</h1>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center p-3 rounded-md ${
                    pathname === item.path
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full p-3 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <span className="mr-3">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
      
      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Navbar superior para móvil */}
        <header className="bg-white shadow-md p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              className="md:hidden mr-4 text-gray-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <h1 className="text-xl font-bold md:hidden">Ticket Lucrapp</h1>
          </div>
          
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <p className="font-medium">
                {user?.firstName 
                  ? `${user.firstName} ${user.lastName || ''}` 
                  : user?.email
                }
              </p>
              <p className="text-sm text-gray-500">
                {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
            
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
              {user?.firstName 
                ? user.firstName.charAt(0).toUpperCase() 
                : user?.email.charAt(0).toUpperCase()
              }
            </div>
          </div>
        </header>
        
        {/* Menú móvil */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMenuOpen(false)}>
            <div className="bg-white w-64 h-full p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Menú</h2>
                <button onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <nav>
                <ul className="space-y-2">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        className={`flex items-center p-3 rounded-md ${
                          pathname === item.path
                            ? 'bg-blue-50 text-blue-600'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  
                  <li>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full p-3 text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <span className="mr-3">🚪</span>
                      Cerrar sesión
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
        
        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}