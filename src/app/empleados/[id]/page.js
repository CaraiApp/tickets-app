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
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState(false);
  const [estadisticasMensualesAbiertas, setEstadisticasMensualesAbiertas] = useState(false);
  const [productosMasConsumidosAbierto, setProductosMasConsumidosAbierto] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);

  useEffect(() => {
    async function fetchEmpleadoData() {
      try {
        // 1. Obtener datos básicos del empleado
        const { data: empleadoData, error: empleadoError } = await supabase
          .from('empleados')
          .select('*')
          .eq('id', id)
          .single();
  
        if (empleadoError) throw empleadoError;
        setEmpleado(empleadoData);
  
        // 2. Obtener el total de tickets para este empleado
        const { count, error: countError } = await supabase
          .from('tickets')
          .select('*', { count: 'exact' })
          .eq('empleado_id', id);
          
        if (countError) throw countError;
        setTotalTickets(count || 0);
        
        // 3. Obtener solo los 10 tickets más recientes del empleado
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .eq('empleado_id', id)
          .order('fecha', { ascending: false })
          .limit(10);
  
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
        
        // 5. Obtener todos los tickets para calcular estadísticas completas
        const { data: allTicketsData, error: allTicketsError } = await supabase
          .from('tickets')
          .select('*')
          .eq('empleado_id', id);
          
        if (allTicketsError) throw allTicketsError;
        
        // 6. Para cada ticket, obtener sus items para las estadísticas
        const allTicketsWithItems = await Promise.all(
          allTicketsData.map(async (ticket) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('items_ticket')
              .select('*')
              .eq('ticket_id', ticket.id);
              
            if (itemsError) console.error('Error obteniendo items para estadísticas:', itemsError);
            
            return {
              ...ticket,
              items_ticket: itemsData || []
            };
          })
        );
        
        // 7. Calcular estadísticas con todos los tickets
        if (allTicketsWithItems.length > 0) {
          let totalGastado = 0;
          const productos = {};
          const estadisticasMensuales = {};
          const productosMensuales = {};
  
          allTicketsWithItems.forEach(ticket => {
            // Conversión segura de total
            const ticketTotal = typeof ticket.total === 'string' 
              ? parseFloat(ticket.total.replace('€', '').replace(',', '.')) 
              : ticket.total || 0;
            
            // Obtener mes del ticket
            const fechaTicket = new Date(ticket.fecha);
            const mes = fechaTicket.toLocaleString('default', { month: 'long' });
            const año = fechaTicket.getFullYear();
            const mesAño = `${mes} ${año}`;
            
            // Acumular total global y por mes
            totalGastado += ticketTotal;
            estadisticasMensuales[mesAño] = (estadisticasMensuales[mesAño] || 0) + ticketTotal;
            
            // Procesamiento de productos
            if (ticket.items_ticket && ticket.items_ticket.length > 0) {
              ticket.items_ticket.forEach(item => {
                const descripcion = item.descripcion;
                const precio = typeof item.precio === 'string'
                  ? parseFloat(item.precio.replace('€', '').replace(',', '.'))
                  : item.precio || 0;
                const cantidad = item.cantidad || 1;
                
                // Acumular productos globales
                if (!productos[descripcion]) {
                  productos[descripcion] = { cantidad, total: precio * cantidad };
                } else {
                  productos[descripcion].cantidad += cantidad;
                  productos[descripcion].total += precio * cantidad;
                }
  
                // Acumular productos mensuales
                if (!productosMensuales[mesAño]) {
                  productosMensuales[mesAño] = {};
                }
                if (!productosMensuales[mesAño][descripcion]) {
                  productosMensuales[mesAño][descripcion] = { cantidad, total: precio * cantidad };
                } else {
                  productosMensuales[mesAño][descripcion].cantidad += cantidad;
                  productosMensuales[mesAño][descripcion].total += precio * cantidad;
                }
              });
            }
          });
  
          // Convertir estadísticas mensuales a lista ordenada
          const estadisticasMensualesOrdenadas = Object.entries(estadisticasMensuales)
            .map(([mesAño, total]) => ({
              mesAño,
              total: total.toFixed(2) + '€'
            }))
            .sort((a, b) => {
              // Ordenar por mes y año
              const [mesA, añoA] = a.mesAño.split(' ');
              const [mesB, añoB] = b.mesAño.split(' ');
              return new Date(añoA, ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'].indexOf(mesA)) - 
                     new Date(añoB, ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'].indexOf(mesB));
            });
  
          const productosList = Object.entries(productos).map(([nombre, datos]) => ({
            nombre,
            cantidad: datos.cantidad,
            total: datos.total.toFixed(2) + '€'
          })).sort((a, b) => b.cantidad - a.cantidad);
  
          setEstadisticas({
            totalGastado: totalGastado.toFixed(2) + '€',
            numeroTickets: allTicketsWithItems.length,
            productosMasConsumidos: productosList,
            estadisticasMensuales: estadisticasMensualesOrdenadas,
            productosMensuales: productosMensuales
          });
        } else {
          setEstadisticas({
            totalGastado: '0.00€',
            numeroTickets: 0,
            productosMasConsumidos: [],
            estadisticasMensuales: [],
            productosMensuales: {}
          });
        }
  
        setLoading(false);
      } catch (error) {
        console.error('Error completo:', error);
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
      // Eliminar los items asociados al ticket primero
      const { error: itemsError } = await supabase
        .from('items_ticket')
        .delete()
        .eq('ticket_id', ticketId);
  
      if (itemsError) throw itemsError;
  
      // Luego eliminar el ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);
  
      if (ticketError) throw ticketError;
  
      // Actualizar el estado local de tickets
      setTickets(tickets.filter(ticket => ticket.id !== ticketId));
      setTotalTickets(prevTotal => prevTotal - 1);
      
      // Actualizar las estadísticas
      if (estadisticas) {
        const nuevoTotalTickets = estadisticas.numeroTickets - 1;
        const nuevoTotalGastado = parseFloat(estadisticas.totalGastado.replace('€', '')) - 
          parseFloat(tickets.find(t => t.id === ticketId).total);
  
        setEstadisticas({
          ...estadisticas,
          numeroTickets: nuevoTotalTickets,
          totalGastado: nuevoTotalGastado.toFixed(2) + '€'
        });
      }
  
      alert('Ticket eliminado correctamente');
    } catch (error) {
      // Método de registro seguro
      if (typeof window !== 'undefined' && window.console && window.console.log) {
        window.console.log('Error al eliminar el ticket:', error);
      }
      
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
        {/* Nuevo bloque de estadísticas resumen */}
        {estadisticas && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Consumido</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.totalGastado}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Número de Tickets</p>
              <p className="text-2xl font-bold text-blue-600">{estadisticas.numeroTickets}</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-start">
            {/* Información del empleado */}
            <div className="flex-grow">
              <h2 className="text-2xl font-bold mb-2">{empleado.nombre} {empleado.apellidos}</h2>
              <p>DNI: {empleado.dni}</p>
              <p>Teléfono: {empleado.telefono}</p>
            </div>

            {/* Firma del empleado */}
            {empleado.firma_url && (
              <div className="ml-4 w-48 h-24 border rounded overflow-hidden">
                <img 
                  src={empleado.firma_url} 
                  alt="Firma de empleado" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex space-x-2">
            {/* Botón de Escanear */}
            <Link 
              href={`/scanner?empleadoId=${id}`} 
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
            >
              Escanear
            </Link>

            {/* Menú de acciones */}
            <div className="relative w-full">
              <button
                onClick={() => setMenuAccionesAbierto(!menuAccionesAbierto)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex justify-between items-center"
              >
                <span>Acciones</span>
                <svg 
                  className={`w-5 h-5 transition-transform ${menuAccionesAbierto ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuAccionesAbierto && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg">
                  <div className="py-1">
                    <Link 
                      href={`/empleados/editar/${id}`} 
                      className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Editar
                    </Link>
                    <button 
                      onClick={confirmarEliminar} 
                      className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Productos Más Consumidos */}
        {estadisticas && estadisticas.productosMasConsumidos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <button
              onClick={() => setProductosMasConsumidosAbierto(!productosMasConsumidosAbierto)}
              className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-3 text-left flex justify-between items-center"
            >
              <h3 className="text-lg font-semibold">Productos Más Consumidos</h3>
              <svg 
                className={`w-5 h-5 transition-transform ${productosMasConsumidosAbierto ? 'transform rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {productosMasConsumidosAbierto && (
              <div className="mt-4">
                <ul className="space-y-2">
                  {estadisticas.productosMasConsumidos.slice(0, 5).map((producto, index) => (
                    <li 
                      key={index} 
                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {producto.nombre}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cantidad: {producto.cantidad}
                        </p>
                      </div>
                      <span className="text-green-600 font-bold">
                        {producto.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Estadísticas Mensuales */}
        {estadisticas && estadisticas.estadisticasMensuales.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <button
              onClick={() => setEstadisticasMensualesAbiertas(!estadisticasMensualesAbiertas)}
              className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-3 text-left flex justify-between items-center"
            >
              <h3 className="text-lg font-semibold">Consumo por Mes</h3>
              <svg 
                className={`w-5 h-5 transition-transform ${estadisticasMensualesAbiertas ? 'transform rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {estadisticasMensualesAbiertas && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {estadisticas.estadisticasMensuales.map((mes, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-300">
                      {mes.mesAño}
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {mes.total}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Historial de Tickets Recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Tickets Recientes</h3>
            <Link 
              href={`/empleados/${id}/tickets`}
              className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
            >
              Ver todos ({totalTickets})
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {tickets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No hay tickets registrados para este empleado.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                  <Link 
                    href={`/tickets/${ticket.id}`} 
                    className="block w-full"
                  >
                    <button
                      className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-3 text-left flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">
                          Fecha: {new Date(ticket.fecha).toLocaleDateString()}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          Total: {typeof ticket.total === 'number' ? ticket.total.toFixed(2) : ticket.total}€
                        </span>
                      </div>
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
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                    </button>
                  </Link>

                  {expandedTickets.includes(ticket.id) && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                      {ticket.items_ticket && ticket.items_ticket.length > 0 ? (
                        <ul className="space-y-1">
                          {ticket.items_ticket && ticket.items_ticket.map((item, index) => (
                            <li key={index} className="flex justify-between text-sm">
                              <span>
                                {item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                                {item.descripcion}
                              </span>
                              <span>
                                {typeof item.precio === 'number' ? item.precio.toFixed(2) : parseFloat(item.precio).toFixed(2)}€
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No hay detalles disponibles para este ticket</p>
                      )}
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button 
                          onClick={() => confirmarEliminarTicket(ticket.id)} 
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar Ticket
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