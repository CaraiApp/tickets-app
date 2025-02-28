'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getUserProfile } from '@/lib/supabase'; // Asegúrate de importar esta función de tu archivo de Supabase

export default function EmpleadosV2() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const supabase = createClientComponentClient();

    async function fetchEmpleados() {
      try {
        // Obtener el perfil del usuario para conseguir organization_id
        const userProfile = await getUserProfile();
        
        if (!userProfile || !userProfile.organization) {
          throw new Error('No se encontró la organización del usuario');
        }

        // Obtener empleados de la organización
        const { data: empleadosData, error: empleadosError } = await supabase
  .from('empleados')
  .select(`
    id, 
    nombre, 
    apellidos, 
    dni, 
    telefono, 
    firma_url,
    tickets (
      id,
      total
    )
  `)
  .eq('organization_id', userProfile.organization.id);

if (empleadosError) throw empleadosError;

        // Procesar datos de empleados con sus tickets
        const empleadosConTotales = empleadosData.map(empleado => {
          // Calcular total de tickets y número de tickets
          const totalTickets = empleado.tickets ? empleado.tickets.length : 0;
          const totalGastado = empleado.tickets 
            ? empleado.tickets.reduce((sum, ticket) => 
                sum + (typeof ticket.total === 'number' ? ticket.total : parseFloat(ticket.total || 0)), 0)
            : 0;

          return {
            ...empleado,
            num_tickets: totalTickets,
            total_gastado: totalGastado
          };
        });

        setEmpleados(empleadosConTotales);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar empleados:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchEmpleados();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error al cargar los empleados: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="container mx-auto">
        {/* Enlace para volver al dashboard */}
        <div className="mb-4">
          <Link 
            href="/dashboard" 
            className="text-blue-500 hover:text-blue-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Empleados</h1>
          <Link 
            href="/empleados/nuevo" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition"
          >
            + Añadir Empleado
          </Link>
        </div>

        {empleados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No hay empleados registrados</p>
            <Link 
              href="/empleados/nuevo" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md inline-block"
            >
              Crear Primer Empleado
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empleados.map((empleado) => (
              <div 
                key={empleado.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <img 
                      src={empleado.firma_url} 
                      alt={`Firma de ${empleado.nombre}`} 
                      className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-gray-200"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {empleado.nombre} {empleado.apellidos}
                      </h2>
                      <p className="text-gray-500 text-sm">{empleado.dni}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Tickets</p>
                      <p className="text-lg font-bold text-blue-600">
                        {empleado.num_tickets}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Gastado</p>
                      <p className="text-lg font-bold text-green-600">
                        {empleado.total_gastado.toLocaleString('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Link 
                      href={`/empleados/${empleado.id}`} 
                      className="text-blue-500 hover:text-blue-700 transition"
                    >
                      Ver Detalles
                    </Link>
                    <Link 
                    href={`/empleados/editar/${empleado.id}`} 
                    className="text-gray-500 hover:text-gray-700 transition"
                    >
                    Editar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}