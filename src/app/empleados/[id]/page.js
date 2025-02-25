"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PerfilEmpleado() {
  const { id } = useParams();
  const [empleado, setEmpleado] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('todo'); // todo, mes, año
  const [expandedTickets, setExpandedTickets] = useState([]);

  // Cargar datos del empleado
  useEffect(() => {
    async function fetchEmpleadoData() {
      try {
        const response = await fetch(`/api/empleados/${id}`);
        if (response.ok) {
          const data = await response.json();
          setEmpleado(data.empleado);
          setTickets(data.tickets);
          setEstadisticas(data.estadisticas);
        } else {
          console.error('Error al cargar datos del empleado');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    }
    
    fetchEmpleadoData();
  }, [id, periodo]);

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
  const confirmarEliminar = () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al empleado ${empleado.nombre} ${empleado.apellidos}?`)) {
      eliminarEmpleado();
    }
  };
  
  const toggleTicket = (ticketId) => {
    setExpandedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId) 
        : [...prev, ticketId]
    );
  };

  const confirmarEliminarTicket = (ticketId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este ticket?")) {
      eliminarTicket(ticketId);
    }
  };
  
  const eliminarTicket = async (ticketId) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Actualizar la lista de tickets (eliminar el ticket de la lista)
        setTickets(tickets.filter(ticket => ticket.id !== ticketId));
        alert('Ticket eliminado correctamente');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'No se pudo eliminar el ticket'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el ticket');
    }
  };


  const eliminarEmpleado = async () => {
    try {
      const response = await fetch(`/api/empleados/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        alert('Empleado eliminado correctamente');
        window.location.href = '/';
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'No se pudo eliminar el empleado'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el empleado');
    }
  };
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
        {/* Información del empleado */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
  <div className="flex flex-col md:flex-row">
    <div className="md:w-2/3">
      <h2 className="text-2xl font-bold mb-2">{empleado.nombre} {empleado.apellidos}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">DNI</p>
          <p>{empleado.dni}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Teléfono</p>
          <p>{empleado.telefono}</p>
        </div>
      </div>
    </div>
    <div className="md:w-1/3 mt-4 md:mt-0 flex justify-center md:justify-end">
      <div className="border border-gray-200 rounded p-2 bg-white">
        <p className="text-sm text-gray-500 text-center mb-1">Firma</p>
        <img 
          src={empleado.firma_url} 
          alt="Firma del empleado" 
          className="h-20 object-contain"
        />
      </div>
    </div>
  </div>

  <div className="mt-4 flex justify-between">
    <div>
      <Link 
        href={`/empleados/editar/${id}`} 
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mr-2"
      >
        Editar
      </Link>
      <button 
        onClick={() => confirmarEliminar()}
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
      >
        Eliminar
      </button>
    </div>
    <Link 
      href={`/scanner?empleadoId=${id}`} 
      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
    >
      Escanear Ticket
    </Link>
  </div>
</div>
        
        {/* Estadísticas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Estadísticas</h3>
            <div className="flex">
              <button 
                onClick={() => setPeriodo('mes')} 
                className={`px-3 py-1 mr-2 rounded ${periodo === 'mes' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Este mes
              </button>
              <button 
                onClick={() => setPeriodo('año')} 
                className={`px-3 py-1 mr-2 rounded ${periodo === 'año' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Este año
              </button>
              <button 
                onClick={() => setPeriodo('todo')} 
                className={`px-3 py-1 rounded ${periodo === 'todo' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Todo
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Gastado</h4>
              <p className="text-2xl font-bold">{estadisticas.totalGastado}</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Nº de Tickets</h4>
              <p className="text-2xl font-bold">{estadisticas.numeroTickets}</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-300">Media por Ticket</h4>
              <p className="text-2xl font-bold">
                {(parseFloat(estadisticas.totalGastado) / estadisticas.numeroTickets).toFixed(2)}€
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-2">Productos más consumidos</h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {estadisticas.productosMasConsumidos.map((producto, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {producto.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {producto.cantidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {producto.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      
        {/* Tickets - Versión con acordeón */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold mb-4">Historial de Tickets</h3>
  
  {tickets.length === 0 ? (
    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
      No hay tickets registrados para este empleado.
    </p>
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
                Total: {typeof ticket.total === 'number' ? ticket.total.toFixed(2) + '€' : ticket.total}
              </span>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform duration-200 ${expandedTickets.includes(ticket.id) ? 'transform rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedTickets.includes(ticket.id) && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600">
              <div>
                <span className="font-semibold">Artículos:</span>
                <ul className="mt-2 space-y-1">
                  {ticket.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span>{item.descripcion || item.name}</span>
                      <span>{typeof item.precio === 'number' ? item.precio.toFixed(2) + '€' : item.precio || item.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 flex justify-end">
                <Link 
                  href={`/tickets/${ticket.id}`}
                  className="text-blue-500 hover:text-blue-700 mr-3"
                >
                  Ver Detalles
                </Link>
                <button 
                  onClick={() => confirmarEliminarTicket(ticket.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Eliminar
                </button>
              </div>
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