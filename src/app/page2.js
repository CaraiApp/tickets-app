"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import supabase from '@/lib/supabase';

export default function Home() {
  const [empleados, setEmpleados] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Nuevos estados para filtros
  const [filtroTiempo, setFiltroTiempo] = useState('todo'); // Opciones: 'todo', 'mes', 'año'
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchDatos() {
      setLoading(true);
      try {
        // Consulta base de empleados con tickets
        let query = supabase.from("empleados").select("*, tickets(id, total, fecha)");

        // Aplicar filtros de tiempo si no es 'todo'
        if (filtroTiempo !== 'todo') {
          // Convertir año y mes a fechas para filtrado
          let fechaInicio, fechaFin;
          
          if (filtroTiempo === 'año') {
            fechaInicio = new Date(añoSeleccionado, 0, 1);
            fechaFin = new Date(añoSeleccionado, 11, 31, 23, 59, 59);
          } else if (filtroTiempo === 'mes') {
            // El mes es 0-indexed en JavaScript
            fechaInicio = new Date(añoSeleccionado, mesSeleccionado - 1, 1);
            fechaFin = new Date(añoSeleccionado, mesSeleccionado, 0, 23, 59, 59);
          }

          // Filtrar tickets dentro del rango de fechas
          query = query.filter('tickets.fecha', 'gte', fechaInicio.toISOString())
                       .filter('tickets.fecha', 'lte', fechaFin.toISOString());
        }

        const { data: empleadosData, error: empleadosError } = await query;

        if (empleadosError) throw empleadosError;

        const empleadosConTotales = empleadosData.map((empleado) => ({
          ...empleado,
          num_tickets: empleado.tickets ? empleado.tickets.length : 0,
          total_gastado: empleado.tickets
            ? empleado.tickets.reduce((sum, t) => sum + (typeof t.total === 'string' 
                ? parseFloat(t.total.replace('€', '')) 
                : t.total), 0)
            : 0,
        }));

        setEmpleados(empleadosConTotales);

        const totalEmpleados = empleadosConTotales.length;
        const totalTickets = empleadosConTotales.reduce((sum, e) => sum + e.num_tickets, 0);
        const totalGastado = empleadosConTotales.reduce((sum, e) => sum + e.total_gastado, 0);
        const mediaPorEmpleado = totalEmpleados > 0 ? (totalGastado / totalEmpleados).toFixed(2) : 0;

        setResumen({
          totalEmpleados,
          totalTickets,
          totalGastado: totalGastado.toFixed(2),
          mediaPorEmpleado,
        });
      } catch (error) {
        // Manejo de error seguro
        if (typeof window !== 'undefined' && window.console && window.console.log) {
          window.console.log("Error al obtener los datos:", error);
        }
        
        // Establecer valores por defecto en caso de error
        setResumen({
          totalEmpleados: 0,
          totalTickets: 0,
          totalGastado: '0.00',
          mediaPorEmpleado: '0.00'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDatos();
  }, [filtroTiempo, mesSeleccionado, añoSeleccionado]);

  // Generar lista de años (desde 2020 hasta el año actual)
  const añosDisponibles = Array.from(
    { length: new Date().getFullYear() - 2020 + 1 }, 
    (_, i) => 2020 + i
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestión de Tickets</h1>
          <div className="flex space-x-2">
            <select 
              value={filtroTiempo}
              onChange={(e) => setFiltroTiempo(e.target.value)}
              className="px-2 py-1 border rounded"
            >
              <option value="todo">Todos los Tiempos</option>
              <option value="mes">Este Mes</option>
              <option value="año">Este Año</option>
            </select>

            {filtroTiempo === 'mes' && (
              <select 
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                  <option key={mes} value={mes}>
                    {new Date(0, mes - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            )}

            {filtroTiempo === 'año' && (
              <select 
                value={añoSeleccionado}
                onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                {añosDisponibles.map((año) => (
                  <option key={año} value={año}>
                    {año}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Resumen General (permanece igual) */}
        {resumen && (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
    <h2 className="text-xl font-semibold mb-4">Resumen General</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-center">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Empleados</h4>
        <p className="text-2xl font-bold">{resumen.totalEmpleados}</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-center">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Tickets</h4>
        <p className="text-2xl font-bold">{resumen.totalTickets}</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-center">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Gastado</h4>
        <p className="text-2xl font-bold">{resumen.totalGastado}€</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-center">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Media por Empleado</h4>
        <p className="text-2xl font-bold">{resumen.mediaPorEmpleado}€</p>
      </div>
    </div>
  </div>
)}

        {/* Lista de Empleados */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Empleados</h2>
          <Link href="/empleados/nuevo" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
            Añadir Empleado
          </Link>
        </div>

        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Cargando datos...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {empleados.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400 rounded-lg shadow">
                <p>No hay empleados registrados aún.</p>
                <p className="mt-2">
                  <Link href="/empleados/nuevo" className="text-blue-500 hover:underline">
                    Añade tu primer empleado
                  </Link>
                </p>
              </div>
            ) : (
              empleados.map((empleado) => (
                <div 
                  key={empleado.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between"
                >
                  <div className="flex-grow">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">
                      {empleado.nombre} {empleado.apellidos}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 flex space-x-4">
                      <span>Tickets: {empleado.num_tickets || 0}</span>
                      <span>
                        Total: {typeof empleado.total_gastado === "number"
                          ? empleado.total_gastado.toFixed(2) + "€"
                          : "0.00€"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 w-full sm:w-auto flex space-x-4 justify-start sm:justify-end">
                    <Link 
                      href={`/empleados/${empleado.id}`} 
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm"
                    >
                      Ver
                    </Link>
                    <Link 
                      href={`/scanner?empleadoId=${empleado.id}`} 
                      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded text-sm"
                    >
                      Escanear
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}