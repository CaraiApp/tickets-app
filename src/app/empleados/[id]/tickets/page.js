"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function TicketsEmpleado() {
  const { id } = useParams();
  const [empleado, setEmpleado] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const ticketsPerPage = 20;

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentPage]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener datos del empleado
      const { data: empleadoData, error: empleadoError } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single();

      if (empleadoError) throw empleadoError;
      setEmpleado(empleadoData);
      
      // 2. Obtener el total de tickets para calcular la paginación
      const { count, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('empleado_id', id);
        
      if (countError) throw countError;
      
      const total = count || 0;
      setTotalTickets(total);
      setTotalPages(Math.ceil(total / ticketsPerPage));
      
      // 3. Obtener los tickets para la página actual
      const from = (currentPage - 1) * ticketsPerPage;
      const to = from + ticketsPerPage - 1;
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('empleado_id', id)
        .order('fecha', { ascending: false })
        .range(from, to);
      
      if (ticketsError) throw ticketsError;
      
      // 4. Para cada ticket, obtener sus items
      const ticketsWithItems = await Promise.all(
        ticketsData.map(async (ticket) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('items_ticket')
            .select('*')
            .eq('ticket_id', ticket.id);
            
          if (itemsError) console.error('Error obteniendo items:', itemsError);
          
          return {
            ...ticket,
            items_ticket: itemsData || []
          };
        })
      );
      
      setTickets(ticketsWithItems);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar los tickets:', error);
      setLoading(false);
    }
  };

  const toggleTicket = (ticketId) => {
    setExpandedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const confirmarEliminarTicket = (ticketId) => {
    setConfirmDeleteId(ticketId);
  };

  const cancelarEliminar = () => {
    setConfirmDeleteId(null);
  };

  const eliminarTicket = async () => {
    if (!confirmDeleteId) return;
    
    try {
      // Eliminar los items asociados al ticket primero
      const { error: itemsError } = await supabase
        .from('items_ticket')
        .delete()
        .eq('ticket_id', confirmDeleteId);
  
      if (itemsError) throw itemsError;
  
      // Luego eliminar el ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', confirmDeleteId);
  
      if (ticketError) throw ticketError;
  
      // Actualizar el estado local
      setTickets(tickets.filter(ticket => ticket.id !== confirmDeleteId));
      setTotalTickets(prevTotal => prevTotal - 1);
      
      // Recalcular el total de páginas
      const newTotalPages = Math.ceil((totalTickets - 1) / ticketsPerPage);
      setTotalPages(newTotalPages);
      
      // Ajustar la página actual si es necesario
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages || 1);
      }
      
      // Limpiar el estado de confirmación
      setConfirmDeleteId(null);
      
    } catch (error) {
      console.error('Error al eliminar el ticket:', error);
      alert('Error al eliminar el ticket');
      setConfirmDeleteId(null);
    }
  };

  if (loading && !tickets.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Cargando tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">
            Historial de Tickets
            {empleado && ` - ${empleado.nombre} ${empleado.apellidos}`}
          </h1>
          <Link href={`/empleados/${id}`} className="text-blue-500 hover:text-blue-700">
            Volver al Perfil
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Tickets ({totalTickets})
            </h2>
            {totalPages > 1 && (
              <div className="text-sm text-gray-500">
                Mostrando página {currentPage} de {totalPages}
              </div>
            )}
          </div>

          {tickets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No hay tickets registrados para este empleado.
            </p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <div 
                    onClick={() => toggleTicket(ticket.id)}
                    className="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex justify-between items-center cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                      <span className="font-medium">
                        Fecha: {new Date(ticket.fecha).toLocaleDateString()}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        Total: {typeof ticket.total === 'number' ? ticket.total.toFixed(2) : ticket.total}€
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link 
                        href={`/tickets/${ticket.id}`}
                        className="text-blue-500 hover:text-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                          />
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                          />
                        </svg>
                      </Link>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmarEliminarTicket(ticket.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
                      </button>
                      <svg 
                        className={`w-5 h-5 transition-transform ${expandedTickets.includes(ticket.id) ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 9l-7 7-7-7" 
                        />
                      </svg>
                    </div>
                  </div>

                  {expandedTickets.includes(ticket.id) && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                      {ticket.items_ticket && ticket.items_ticket.length > 0 ? (
                        <ul className="space-y-2">
                          {ticket.items_ticket.map((item, index) => (
                            <li key={index} className="flex justify-between">
                              <span>
                                {item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                                {item.descripcion}
                              </span>
                              <span className="font-medium">
                                {typeof item.precio === 'number' ? item.precio.toFixed(2) : parseFloat(item.precio).toFixed(2)}€
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">
                          No hay detalles disponibles para este ticket
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  &laquo;
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  &lt;
                </button>

                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                    // Mostrar 5 páginas centradas en la página actual cuando sea posible
                    let pageToShow;
                    if (totalPages <= 5) {
                      pageToShow = index + 1;
                    } else if (currentPage <= 3) {
                      pageToShow = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageToShow = totalPages - 4 + index;
                    } else {
                      pageToShow = currentPage - 2 + index;
                    }

                    return (
                      <button
                        key={pageToShow}
                        onClick={() => handlePageChange(pageToShow)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageToShow
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageToShow}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  &gt;
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  &raquo;
                </button>
              </nav>
            </div>
          )}

          {/* Modal de confirmación para eliminar ticket */}
          {confirmDeleteId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-lg font-bold mb-3">Confirmar eliminación</h3>
                <p className="mb-4">
                  ¿Estás seguro de que deseas eliminar este ticket? Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelarEliminar}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={eliminarTicket}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}