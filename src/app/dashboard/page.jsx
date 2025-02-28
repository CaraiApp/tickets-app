'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [resumen, setResumen] = useState({
    totalEmpleados: 0,
    totalTickets: 0,
    totalGastado: '0.00',
    mediaPorEmpleado: '0.00'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Mostrar mensaje si se completa el checkout
    if (searchParams.get('success')) {
      setMessage('¡Suscripción realizada con éxito! Tu plan ha sido actualizado.');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener datos del usuario actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw new Error(`Error de sesión: ${sessionError.message}`);
        
        if (!session) {
          window.location.href = '/login';
          return;
        }
        
        // Obtener perfil y organización
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*, organizations(*)')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw new Error(`Error al obtener perfil: ${profileError.message}`);
        
        if (!profile || !profile.organizations) {
          throw new Error('No se encontró la organización del usuario');
        }
          
        setUser({
          id: session.user.id,
          email: session.user.email,
          role: profile.role,
          firstName: profile.first_name,
          lastName: profile.last_name
        });
          
        setOrganization(profile.organizations);
        
        const organizationId = profile.organization_id;
        
        console.log("ID de la organización:", organizationId);
        
        // Obtener empleados de la organización
        const { data: empleados, error: empleadosError } = await supabase
          .from('empleados')
          .select('id')
          .eq('organization_id', organizationId);
          
        if (empleadosError) throw new Error(`Error al obtener empleados: ${empleadosError.message}`);
        
        // Obtener directamente todos los tickets de la organización
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, total')
          .eq('organization_id', organizationId);
          
        if (ticketsError) throw new Error(`Error al obtener tickets: ${ticketsError.message}`);
        
        console.log("Tickets encontrados:", tickets?.length || 0);
        
        // Calcular estadísticas
        const totalEmpleados = empleados?.length || 0;
        const totalTickets = tickets?.length || 0;
        
        // Calcular total gastado
        let totalGastado = 0;
        if (tickets && tickets.length > 0) {
          totalGastado = tickets.reduce((sum, ticket) => {
            let ticketTotal = 0;
            
            if (ticket.total !== null && ticket.total !== undefined) {
              if (typeof ticket.total === 'string') {
                // Limpiar el string de cualquier símbolo de moneda o coma
                const cleanTotal = ticket.total.replace(/[^0-9.,]/g, '').replace(',', '.');
                ticketTotal = parseFloat(cleanTotal) || 0;
              } else {
                ticketTotal = parseFloat(ticket.total) || 0;
              }
            }
            
            return sum + ticketTotal;
          }, 0);
        }
        
        const mediaPorEmpleado = totalEmpleados > 0 ? (totalGastado / totalEmpleados).toFixed(2) : '0.00';
        
        setResumen({
          totalEmpleados,
          totalTickets,
          totalGastado: totalGastado.toFixed(2),
          mediaPorEmpleado
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md w-full">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <Link 
          href="/dashboard" 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Reintentar
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Mensaje de éxito */}
      {message && (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-6">
          {message}
        </div>
      )}
      
      {/* Header con información de la empresa */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{organization?.name || 'Mi Organización'}</h1>
            <p className="text-gray-600 mt-1">
              Plan: <span className="font-medium capitalize">{organization?.subscription_plan || 'Free'}</span>
              {' • '}
              Estado: <span className={`font-medium ${
                organization?.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'
              }`}>
                {organization?.subscription_status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </p>
          </div>
          
          <Link
            href="/dashboard/settings"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md transition duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración
          </Link>
        </div>
      </div>
      
      {/* Resumen General con mejor estilo */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Resumen General</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow border border-blue-100">
            <h4 className="text-sm font-medium text-blue-600 mb-2">Total Empleados</h4>
            <p className="text-3xl font-bold text-gray-800">{resumen.totalEmpleados}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow border border-purple-100">
            <h4 className="text-sm font-medium text-purple-600 mb-2">Total Tickets</h4>
            <p className="text-3xl font-bold text-gray-800">{resumen.totalTickets}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow border border-green-100">
            <h4 className="text-sm font-medium text-green-600 mb-2">Total Gastado</h4>
            <p className="text-3xl font-bold text-gray-800">{resumen.totalGastado}€</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-lg shadow border border-amber-100">
            <h4 className="text-sm font-medium text-amber-600 mb-2">Media por Empleado</h4>
            <p className="text-3xl font-bold text-gray-800">{resumen.mediaPorEmpleado}€</p>
          </div>
        </div>
      </div>
      
      {/* Acciones rápidas con mejor diseño */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Acciones Rápidas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/empleados/nuevo"
            className="group bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg shadow transition duration-200 text-center flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-lg font-medium">Crear Nuevo Empleado</span>
          </Link>
          
          <Link
            href="/empleados2"
            className="group bg-indigo-500 hover:bg-indigo-600 text-white p-6 rounded-lg shadow transition duration-200 text-center flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-lg font-medium">Ver Empleados</span>
          </Link>
          
          <Link
            href="/estadisticas"
            className="group bg-emerald-500 hover:bg-emerald-600 text-white p-6 rounded-lg shadow transition duration-200 text-center flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-lg font-medium">Estadísticas</span>
          </Link>
        </div>
      </div>
      
      {organization?.subscription_plan === 'free' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-6">
              <h3 className="text-xl font-bold text-blue-800 mb-3">¡Mejora tu plan!</h3>
              <p className="text-gray-700 max-w-xl">
                Actualiza a un plan premium para desbloquear funcionalidades avanzadas, 
                más usuarios y soporte prioritario.
              </p>
            </div>
            <Link
              href="/pricing"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition duration-200 whitespace-nowrap"
            >
              Ver planes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}