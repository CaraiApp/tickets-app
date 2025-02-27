"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

export default function DetalleTicket() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  useEffect(() => {
    async function fetchTicketData() {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("*, items_ticket(descripcion, precio, cantidad)")
          .eq("id", id)
          .single();

        if (error) throw error;

        setTicket(data);
      } catch (error) {
        console.error("Error al obtener el ticket:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTicketData();
  }, [id]);

  const confirmarEliminar = () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este ticket?")) {
      eliminarTicket();
    }
  };

  const eliminarTicket = async () => {
    try {
      // Primero, eliminar los items del ticket
      const { error: itemsError } = await supabase
        .from('items_ticket')
        .delete()
        .eq('ticket_id', id);
  
      if (itemsError) throw itemsError;
  
      // Luego, eliminar el ticket principal
      const { error: ticketError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);
  
      if (ticketError) throw ticketError;
  
      // Mostrar modal de éxito
      setMostrarConfirmacion(true);
  
      // Redirigir después de un breve tiempo
      setTimeout(() => {
        router.push(`/empleados/${ticket.empleado_id}`);
      }, 1500);
  
    } catch (error) {
      console.error('Error completo al eliminar ticket:', error);
      alert(`Error al eliminar el ticket: ${error.message || 'Error desconocido'}`);
    }
  };

  // Añadir función para editar
  const handleEditar = () => {
    // Navegar a la página de edición de ticket
    router.push(`/tickets/editar/${id}`);
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

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="p-4 bg-white dark:bg-gray-800 shadow">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Detalle de Ticket</h1>
            <Link href="/" className="text-blue-500 hover:text-blue-700">
              Volver
            </Link>
          </div>
        </header>

        <div className="container mx-auto p-4">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>El ticket no existe o ha sido eliminado.</p>
            <Link href="/" className="text-blue-500 hover:underline mt-2 inline-block">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Detalle de Ticket</h1>
          <Link href={`/empleados/${ticket.empleado_id}`} className="text-blue-500 hover:text-blue-700">
            Volver al Empleado
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4">Ticket #{id}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fecha</p>
                  <p className="font-medium">{new Date(ticket.fecha).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-medium">
                    {typeof ticket.total === "number" ? ticket.total.toFixed(2) + "€" : ticket.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={handleEditar} 
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                Editar
              </button>
              <button 
                onClick={confirmarEliminar} 
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
              >
                Eliminar
              </button>
            </div>
          </div>

          {ticket.imagen_url && (
            <div className="my-6 border rounded p-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Imagen del Ticket</p>
              <img src={ticket.imagen_url} alt="Ticket" className="max-w-full h-auto max-h-96 mx-auto" />
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Artículos</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Precio
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {ticket.items_ticket.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-6 py-4 whitespace-normal break-words">{item.descripcion}</td>
                      <td className="px-6 py-4">{item.cantidad || 1}</td>
                      <td className="px-6 py-4 text-right">
                        {typeof item.precio === "number" ? item.precio.toFixed(2) + "€" : item.precio}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <td className="px-6 py-3 text-right font-medium" colSpan="2">
                      Total:
                    </td>
                    <td className="px-6 py-3 text-right font-bold">
                      {typeof ticket.total === "number" ? ticket.total.toFixed(2) + "€" : ticket.total}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
      {mostrarConfirmacion && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center">
      <svg 
        className="mx-auto mb-4 w-16 h-16 text-green-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 13l4 4L19 7" 
        />
      </svg>
      <h2 className="text-2xl font-bold mb-4">Ticket Eliminado</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        El ticket se ha eliminado correctamente
      </p>
    </div>
  </div>
)}
    </div>
  );
}