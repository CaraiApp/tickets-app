"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

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

  // State variables with JSDoc comments for type hinting
  /** @type {Object} */
  const [empleado, setEmpleado] = useState(null);
  
  /** @type {string} */
  const [capturedImage, setCapturedImage] = useState(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  /** @type {Object} */
  const [results, setResults] = useState(null);
  
  const [editandoResultados, setEditandoResultados] = useState(false);
  
  /** @type {Object} */
  const [resultadosEditados, setResultadosEditados] = useState(null);

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

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Update editable results when results change
  useEffect(() => {
    if (results) {
      setResultadosEditados({ ...results });
    }
  }, [results]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
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
      console.log("Enviando imagen para procesamiento...");
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
    if (!resultadosEditados || !empleadoId) return;
  
    try {
      // Convertir la fecha a un timestamp
      const fechaTimestamp = new Date(resultadosEditados.fecha);
  
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
  
      if (ticketError) {
        console.log("Error en ticket:", ticketError);
        throw ticketError;
      }
  
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
  
      if (itemsError) {
        console.log("Error en items:", itemsError);
        throw itemsError;
      }
  
      alert("Ticket guardado correctamente");
      router.push(`/empleados/${empleadoId}`);
    } catch (error) {
      console.log("Error completo:", error);
      alert(`Error al guardar el ticket: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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

      <main className="container mx-auto p-4 max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          {!capturedImage ? (
            <>
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                  Iniciar Cámara
                </button>
                <button onClick={captureImage} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
                  Capturar
                </button>
              </div>
            </>
          ) : (
            <>
              <img src={capturedImage} alt="Ticket capturado" className="w-full h-auto" />
              <button onClick={resetCapture} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full">
                Nueva Captura
              </button>
            </>
          )}
        </div>

        {isProcessing && (
          <div className="text-center mt-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Procesando imagen...</p>
          </div>
        )}

        {results && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
                      type="text"
                      value={resultadosEditados.fecha}
                      onChange={(e) => setResultadosEditados({...resultadosEditados, fecha: e.target.value})}
                      className="px-2 py-1 border rounded"
                    />
                  ) : (
                    <span>{results.fecha}</span>
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
                            &times;
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
                
                {results && (
                  <button 
                    onClick={guardarTicket} 
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded w-full"
                  >
                    Guardar Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}