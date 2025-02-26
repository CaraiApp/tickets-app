"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function PerfilEmpleado() {
  const { id } = useParams();
  const router = useRouter();
  const [empleado, setEmpleado] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('todo'); // todo, mes, año
  const [expandedTickets, setExpandedTickets] = useState([]);

  useEffect(() => {
    async function fetchEmpleadoData() {
      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('*, tickets(id, fecha, total, items_ticket(descripcion, precio))')
          .eq('id', id)
          .single();

        if (error) throw error;

        setEmpleado(data);
        setTickets(data.tickets || []);
        
        // Calcular estadísticas
        const totalGastado = data.tickets.reduce((sum, t) => sum + t.total, 0);
        const numeroTickets = data.tickets.length;
        const productos = {};
        
        data.tickets.forEach(ticket => {
          ticket.items_ticket.forEach(item => {
            if (!productos[item.descripcion]) {
              productos[item.descripcion] = { cantidad: 1, total: item.precio };
            } else {
              productos[item.descripcion].cantidad += 1;
              productos[item.descripcion].total += item.precio;
            }
          });
        });

        setEstadisticas({
          totalGastado,
          numeroTickets,
          productosMasConsumidos: Object.entries(productos).map(([nombre, datos]) => ({
            nombre,
            cantidad: datos.cantidad,
            total: datos.total.toFixed(2) + '€',
          })),
        });

        setLoading(false);
      } catch (error) {
        console.error('Error al obtener datos del empleado:', error);
        setLoading(false);
      }
    }

    fetchEmpleadoData();
  }, [id, periodo]);

  const confirmarEliminar = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al empleado ${empleado.nombre} ${empleado.apellidos}?`)) {
      await eliminarEmpleado();
    }
  };

  const toggleTicket = (ticketId) => {
    setExpandedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const confirmarEliminarTicket = async (ticketId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este ticket?")) {
      await eliminarTicket(ticketId);
    }
  };

  const eliminarTicket = async (ticketId) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(tickets.filter(ticket => ticket.id !== ticketId));
      alert('Ticket eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar el ticket:', error);
      alert('Error al eliminar el ticket');
    }
  };

  const eliminarEmpleado = async () => {
    try {
      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Empleado eliminado correctamente');
      router.push('/');
    } catch (error) {
      console.error('Error al eliminar el empleado:', error);
      alert('Error al eliminar el empleado');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Perfil del Empleado</h1>
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            Volver
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">{empleado.nombre} {empleado.apellidos}</h2>
          <p>DNI: {empleado.dni}</p>
          <p>Teléfono: {empleado.telefono}</p>

          <div className="mt-4 flex justify-between">
            <Link href={`/empleados/editar/${id}`} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
              Editar
            </Link>
            <button onClick={confirmarEliminar} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">
              Eliminar
            </button>
          </div>
        </div>

        {/* Historial de Tickets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Historial de Tickets</h3>
          {tickets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No hay tickets registrados para este empleado.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                  <button
                    onClick={() => toggleTicket(ticket.id)}
                    className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-3 text-left flex justify-between items-center"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">
                        Fecha: {new Date(ticket.fecha).toLocaleDateString()}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        Total: {ticket.total.toFixed(2)}€
                      </span>
                    </div>
                  </button>

                  {expandedTickets.includes(ticket.id) && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                      <ul>
                        {ticket.items_ticket.map((item, index) => (
                          <li key={index}>{item.descripcion} - {item.precio.toFixed(2)}€</li>
                        ))}
                      </ul>
                      <button onClick={() => confirmarEliminarTicket(ticket.id)} className="text-red-500 hover:text-red-700">
                        Eliminar Ticket
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
