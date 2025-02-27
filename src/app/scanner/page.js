"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabase";
import NodeCache from 'node-cache';

// Main component with Suspense
export default function ScannerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Cargando...</p>
        </div>
      </div>
    }>
      <Scanner />
    </Suspense>
  );
}

// Scanner component with all logic
function Scanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const empleadoId = searchParams.get("empleadoId");
  const cache = new NodeCache();

  // State variables
  const [empleado, setEmpleado] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [editandoResultados, setEditandoResultados] = useState(false);
  const [resultadosEditados, setResultadosEditados] = useState(null);
  const [mostrarModalExito, setMostrarModalExito] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Load employee data from Supabase
  useEffect(() => {
    if (empleadoId) {
      async function fetchEmpleadoData() {
        const { data, error } = await supabase
          .from("empleados")
          .select("*")
          .eq("id", empleadoId)
          .single();

        if (error) {
          console.error("Error al obtener empleado:", error);
        } else {
          setEmpleado(data);
        }
      }

      fetchEmpleadoData();
    }
  }, [empleadoId]);

  // Iniciar cámara automáticamente
  useEffect(() => {
    const permisoGuardado = localStorage.getItem('camera_permission');
    
    if (!permisoGuardado) {
      startCamera();
    } else if (permisoGuardado === 'true') {
      startCamera();
    }
  }, []);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (results) {
      try {
        // La fecha ya debería venir en formato YYYY-MM-DD desde la API
        // Pero añadimos una capa adicional de seguridad
        
        let inputDate = results.fecha;
        
        // Verificar si la fecha tiene el formato correcto (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
          // Si no tiene el formato correcto, intentar convertirla
          const dateObj = new Date(inputDate);
          if (!isNaN(dateObj.getTime())) {
            inputDate = dateObj.toISOString().split('T')[0];
          } else {
            // Si no se puede convertir, usar la fecha actual
            const today = new Date();
            inputDate = today.toISOString().split('T')[0];
          }
        }
        
        setResultadosEditados({ 
          ...results, 
          fecha: inputDate
        });
      } catch (error) {
        console.error("Error al procesar la fecha:", error);
        // Usar la fecha actual como fallback en caso de error
        const today = new Date();
        setResultadosEditados({ 
          ...results, 
          fecha: today.toISOString().split('T')[0]
        });
      }
    }
  }, [results]);

  const startCamera = async () => {
    try {
      const permisoGuardado = cache.get('camera_permission');
  
      if (!permisoGuardado) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
  
        cache.set('camera_permission', true);
  
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        // El permiso ya fue concedido anteriormente
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
  
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      cache.set('camera_permission', false);
  
      console.error("Error al acceder a la cámara:", err);
      alert("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      stopCamera();
      processImage(imageData);
    }
  };

  const processImage = async (imageData) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/process-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
  
      const data = await response.json();
  
      if (data.error) {
        alert(`Error al procesar el ticket: ${data.error}`);
        setResults(null);
      } else {
        setResults(data);
      }
    } catch (error) {
      console.error("Error al procesar la imagen:", error);
      alert("Error al procesar la imagen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setResults(null);
    startCamera();
  };

  const guardarTicket = async () => {
    if (!resultadosEditados || !empleadoId || !resultadosEditados.fecha) return;
  
    try {
      // Crear un objeto Date válido
      let fechaTimestamp;
      try {
        fechaTimestamp = new Date(resultadosEditados.fecha);
        
        // Verificar si la fecha es válida
        if (isNaN(fechaTimestamp.getTime())) {
          // Si no es válida, usar la fecha actual
          fechaTimestamp = new Date();
        }
      } catch (error) {
        console.error("Error al procesar la fecha:", error);
        fechaTimestamp = new Date();
      }
      
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert([
          {
            empleado_id: parseInt(empleadoId),
            fecha: fechaTimestamp,
            total: parseFloat(resultadosEditados.total.replace("€", "")),
            imagen_url: capturedImage,
          },
        ])
        .select();
      
      if (ticketError) throw ticketError;
  
      const ticketId = ticketData[0].id;
  
      const itemsToInsert = resultadosEditados.items.map((item) => ({
        ticket_id: ticketId,
        descripcion: item.name,
        precio: parseFloat(item.price.replace("€", "")),
        cantidad: item.quantity || 1,
      }));
  
      const { error: itemsError } = await supabase
        .from("items_ticket")
        .insert(itemsToInsert);
  
      if (itemsError) throw itemsError;
  
      setMostrarModalExito(true);
      setTimeout(() => {
        router.push(`/empleados/${empleadoId}`);
      }, 1500);
    } catch (error) {
      console.error("Error al guardar el ticket:", error);
      alert(`Error al guardar el ticket: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Escáner de Tickets</h1>
          {empleado && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Empleado: {empleado.nombre} {empleado.apellidos}
            </p>
          )}
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            Volver
          </Link>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-4 max-w-md flex flex-col">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col mb-4">
          {!capturedImage ? (
            <>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4" style={{ height: '500px' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              </div>
              <button 
                onClick={captureImage} 
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg text-lg font-bold"
              >
                Capturar Ticket
              </button>
            </>
          ) : (
            <>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4" style={{ height: '300px' }}>
                <img 
                  src={capturedImage} 
                  alt="Ticket capturado" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={resetCapture} 
                  className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg"
                >
                  Nueva Captura
                </button>
                {results && (
                  <button 
                    onClick={guardarTicket} 
                    className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg"
                  >
                    Guardar Ticket
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {isProcessing && (
          <div className="text-center mt-4 mb-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Procesando imagen...</p>
          </div>
        )}

        {results && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Resultados</h2>
              <button 
                onClick={() => setEditandoResultados(!editandoResultados)}
                className="text-blue-500 hover:text-blue-700"
              >
                {editandoResultados ? 'Cancelar Edición' : 'Editar Resultados'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="flex items-center">
                  <span className="font-semibold mr-2">Total:</span>
                  {editandoResultados ? (
                    <input
                      type="text"
                      value={resultadosEditados.total}
                      onChange={(e) => setResultadosEditados({...resultadosEditados, total: e.target.value})}
                      className="px-2 py-1 border rounded"
                    />
                  ) : (
                    <span>{results.total}</span>
                  )}
                </div>
              </div>
              
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="flex items-center">
                  <span className="font-semibold mr-2">Fecha:</span>
                  {editandoResultados ? (
                    <input
                      type="date"
                      value={resultadosEditados.fecha}
                      onChange={(e) => setResultadosEditados({...resultadosEditados, fecha: e.target.value})}
                      className="px-2 py-1 border rounded"
                    />
                  ) : (
                    <span>{results.fecha && new Date(results.fecha).toLocaleDateString() || "Fecha no disponible"}</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Artículos:</span>
                  {editandoResultados && (
                    <button 
                      onClick={() => {
                        setResultadosEditados({
                          ...resultadosEditados,
                          items: [...resultadosEditados.items, { name: '', price: '0.00€', quantity: 1 }]
                        });
                      }}
                      className="text-green-500 hover:text-green-700 text-sm"
                    >
                      + Añadir Artículo
                    </button>
                  )}
                </div>
                
                <ul className="mt-2 space-y-2">
                  {(editandoResultados ? resultadosEditados.items : results.items)?.map((item, index) => (
                    <li key={index} className="p-2 bg-gray-100 dark:bg-gray-700 rounded flex justify-between items-center">
                      {editandoResultados ? (
                        <div className="flex items-center w-full">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => {
                              const updatedItems = [...resultadosEditados.items];
                              updatedItems[index] = { 
                                ...item, 
                                quantity: parseInt(e.target.value) || 1 
                              };
                              setResultadosEditados({...resultadosEditados, items: updatedItems});
                            }}
                            className="px-2 py-1 border rounded w-16 mr-2"
                          />
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updatedItems = [...resultadosEditados.items];
                              updatedItems[index] = { ...item, name: e.target.value };
                              setResultadosEditados({...resultadosEditados, items: updatedItems});
                            }}
                            className="px-2 py-1 border rounded flex-1 mr-2"
                          />
                          <input
                            type="text"
                            value={item.price}
                            onChange={(e) => {
                              const updatedItems = [...resultadosEditados.items];
                              updatedItems[index] = { ...item, price: e.target.value };
                              setResultadosEditados({...resultadosEditados, items: updatedItems});
                            }}
                            className="px-2 py-1 border rounded w-24"
                          />
                          <button 
                            onClick={() => {
                              const updatedItems = [...resultadosEditados.items];
                              updatedItems.splice(index, 1);
                              setResultadosEditados({...resultadosEditados, items: updatedItems});
                            }}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between w-full">
                          <span>{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</span>
                          <span>{item.price}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button 
                onClick={guardarTicket} 
                className="mt-6 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg w-full font-semibold"
              >
                Guardar Ticket
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de éxito */}
      {mostrarModalExito && (
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
            <h2 className="text-2xl font-bold mb-4">Ticket Guardado</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              El ticket se ha guardado correctamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}