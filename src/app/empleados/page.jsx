'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const supabase = createClientComponentClient();

    async function fetchEmpleados() {
      try {
        // Obtener empleados con tickets relacionados
        const { data, error } = await supabase
          .from('empleados')
          .select('*, tickets(id, total)');

        if (error) throw error;

        // Calcular número de tickets y total gastado para cada empleado
        const empleadosConTotales = data.map(empleado => ({
          ...empleado,
          num_tickets: empleado.tickets ? empleado.tickets.length : 0,
          total_gastado: empleado.tickets 
            ? empleado.tickets.reduce((sum, ticket) => sum + (ticket.total || 0), 0) 
            : 0
        }));

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error al cargar los empleados: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Empleados</h1>
          <Link 
            href="/empleados/nuevo" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Añadir Empleado
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {empleados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No hay empleados registrados</p>
            <Link 
              href="/empleados/nuevo" 
              className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Añadir Primer Empleado
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empleados.map((empleado) => (
              <div 
                key={empleado.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <div className="flex items-center mb-4">
                  <img 
                    src={empleado.firma_url} 
                    alt={`Firma de ${empleado.nombre}`} 
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h2 className="text-lg font-bold">
                      {empleado.nombre} {empleado.apellidos}
                    </h2>
                    <p className="text-gray-600">{empleado.dni}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Tickets</p>
                    <p className="text-lg font-bold">{empleado.num_tickets}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Gastado</p>
                    <p className="text-lg font-bold">
                      {empleado.total_gastado.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between">
                  <Link 
                    href={`/empleados/${empleado.id}`} 
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Ver Detalles
                  </Link>
                  <Link 
                    href={`/empleados/${empleado.id}/editar`} 
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}