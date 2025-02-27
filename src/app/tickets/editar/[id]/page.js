"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import supabase from "@/lib/supabase";

export default function EditarTicket() {
  const { id } = useParams();
  const router = useRouter();

  // Estados para el ticket y sus items
  const [ticket, setTicket] = useState(null);
  const [fecha, setFecha] = useState("");
  const [total, setTotal] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagenUrl, setImagenUrl] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Cargar datos del ticket
  useEffect(() => {
    async function fetchTicketData() {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("*, items_ticket(descripcion, precio, cantidad)")
          .eq("id", id)
          .single();

        if (error) throw error;

        // Formatear fecha para input de fecha
        const formattedDate = new Date(data.fecha).toISOString().split('T')[0];

        setTicket(data);
        setFecha(formattedDate);
        setTotal(typeof data.total === 'number' ? data.total.toFixed(2) : data.total);
        setItems(data.items_ticket.map(item => ({
          descripcion: item.descripcion,
          precio: typeof item.precio === 'number' ? item.precio.toFixed(2) : item.precio,
          cantidad: item.cantidad || 1
        })));
        setImagenUrl(data.imagen_url || "");
        
        setLoading(false);
      } catch (error) {
        console.error("Error al obtener el ticket:", error);
        setLoading(false);
      }
    }

    fetchTicketData();
  }, [id]);

  // Añadir nuevo item
  const addItem = () => {
    setItems([...items, { descripcion: "", precio: "", cantidad: 1 }]);
  };

  // Actualizar item
  const updateItem = (index, field, value) => {
    const nuevosItems = [...items];
    nuevosItems[index][field] = value;
    setItems(nuevosItems);
  };

  // Eliminar item
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Guardar cambios
  const guardarCambios = async () => {
    try {
      // Validar campos
      if (!fecha || !total || items.length === 0) {
        alert("Por favor, complete todos los campos obligatorios");
        return;
      }

      // Comenzar transacción
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .update({
          fecha: new Date(fecha),
          total: parseFloat(total.replace('€', '')),
          imagen_url: imagenUrl
        })
        .eq("id", id)
        .select();

      if (ticketError) throw ticketError;

      // Eliminar items antiguos
      const { error: deleteItemsError } = await supabase
        .from("items_ticket")
        .delete()
        .eq("ticket_id", id);

      if (deleteItemsError) throw deleteItemsError;

      // Insertar nuevos items
      const itemsToInsert = items.map(item => ({
        ticket_id: id,
        descripcion: item.descripcion,
        precio: parseFloat(item.precio.replace('€', '')),
        cantidad: parseInt(item.cantidad)
      }));

      const { error: insertItemsError } = await supabase
        .from("items_ticket")
        .insert(itemsToInsert);

      if (insertItemsError) throw insertItemsError;

      // Mostrar confirmación
      setMostrarConfirmacion(true);

      // Redirigir a la página del ticket después de un breve tiempo
      setTimeout(() => {
        router.push(`/tickets/${id}`);
      }, 1500);

    } catch (error) {
      console.error("Error al guardar los cambios:", error);
      alert("Error al guardar los cambios del ticket");
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
          <h1 className="text-xl font-bold">Editar Ticket</h1>
          <Link href={`/tickets/${id}`} className="text-blue-500 hover:text-blue-700">
            Cancelar
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total
              </label>
              <input
                type="text"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {imagenUrl && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Imagen del Ticket
              </label>
              <img 
                src={imagenUrl} 
                alt="Ticket" 
                className="max-w-full h-auto max-h-96 mx-auto rounded-md" 
              />
              <input
                type="text"
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                placeholder="URL de la imagen"
                className="mt-2 w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Artículos</h3>
              <button
                onClick={addItem}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
              >
                + Añadir Artículo
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                >
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                    className="flex-grow px-3 py-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                  />
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                    min="1"
                    className="w-24 px-3 py-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Precio"
                    value={item.precio}
                    onChange={(e) => updateItem(index, 'precio', e.target.value)}
                    className="w-32 px-3 py-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                  />
                  <button
                    onClick={() => removeItem(index)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => router.push(`/tickets/${id}`)}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Cancelar
            </button>
            <button
              onClick={guardarCambios}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
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
            <h2 className="text-2xl font-bold mb-4">Ticket Actualizado</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              El ticket se ha guardado correctamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}