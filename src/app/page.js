"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [empleados, setEmpleados] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      try {
        // Obtener empleados
        const responseEmpleados = await fetch('/api/empleados');
        let datosEmpleados = [];
        
        if (responseEmpleados.ok) {
          datosEmpleados = await responseEmpleados.json();
          setEmpleados(datosEmpleados);
        }
        
        // Obtener resumen general
        const responseResumen = await fetch('/api/resumen');
        if (responseResumen.ok) {
          const datosResumen = await responseResumen.json();
          setResumen(datosResumen);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDatos();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Gestión de Tickets</h1>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Resumen General */}
        {resumen && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Resumen General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Empleados</h4>
                <p className="text-2xl font-bold">{resumen.totalEmpleados}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Tickets</h4>
                <p className="text-2xl font-bold">{resumen.totalTickets}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Gastado</h4>
                <p className="text-2xl font-bold">{resumen.totalGastado}€</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Media por Empleado</h4>
                <p className="text-2xl font-bold">{resumen.mediaPorEmpleado}€</p>
              </div>
            </div>
          </div>
        )}
      
        {/* Lista de Empleados */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Empleados</h2>
          <Link 
            href="/empleados/nuevo" 
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Añadir Empleado
          </Link>
        </div>

        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Cargando datos...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {empleados.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No hay empleados registrados aún.</p>
                <p className="mt-2">
                  <Link 
                    href="/empleados/nuevo" 
                    className="text-blue-500 hover:underline"
                  >
                    Añade tu primer empleado
                  </Link>
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {empleados.map((empleado) => (
                    <tr key={empleado.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">{empleado.nombre} {empleado.apellidos}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {empleado.num_tickets || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {typeof empleado.total_gastado === 'number' 
                          ? empleado.total_gastado.toFixed(2) + '€' 
                          : (empleado.total_gastado || '0.00€')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/empleados/${empleado.id}`}
                          className="text-blue-500 hover:text-blue-700 mr-4"
                        >
                          Ver
                        </Link>
                        <Link 
                          href={`/scanner?empleadoId=${empleado.id}`}
                          className="text-green-500 hover:text-green-700"
                        >
                          Escanear
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}