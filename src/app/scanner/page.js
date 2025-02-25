"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Componente principal con Suspense
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

// Componente Scanner que contiene toda la lógica
function Scanner() {
  const searchParams = useSearchParams();
  const empleadoId = searchParams.get("empleadoId");
  
  const [empleado, setEmpleado] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [editandoResultados, setEditandoResultados] = useState(false);
  const [resultadosEditados, setResultadosEditados] = useState(null);

  // Cargar datos del empleado
  useEffect(() => {
    if (empleadoId) {
      async function fetchEmpleadoData() {
        try {
          const response = await fetch(`/api/empleados/${empleadoId}`);
          if (response.ok) {
            const data = await response.json();
            setEmpleado(data.empleado);
          } else {
            console.error('Error al cargar datos del empleado');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
      
      fetchEmpleadoData();
    }
  }, [empleadoId]);

  useEffect(() => {
    // Limpieza al desmontar el componente
    return () => {
      stopCamera();
    };
  }, []);

  // Cuando se reciben resultados, inicializar los resultados editados
  useEffect(() => {
    if (results) {
      setResultadosEditados({...results});
    }
  }, [results]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    stopCamera();
    processImage(imageData);
  };

  const processImage = async (imageData) => {
    setIsProcessing(true);
    
    try {
      console.log('Enviando imagen para procesamiento...');
      const response = await fetch('/api/process-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });
      
      console.log('Respuesta recibida, status:', response.status);
      
      const data = await response.json();
      console.log('Datos de respuesta:', data);
      
      if (data.error) {
        console.error('Error en la respuesta:', data.error, data.details || '');
        setResults(null);
        alert(`Error al procesar el ticket: ${data.error}`);
      } else {
        console.log('Procesamiento exitoso:', data);
        setResults(data);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert(`Error al procesar la imagen: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setResults(null);
    startCamera();
  };

  // Añadir función para manejar cambios en los items
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...resultadosEditados.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    setResultadosEditados({
      ...resultadosEditados,
      items: updatedItems
    });
  };

  // Añadir función para añadir un ítem nuevo
  const addNewItem = () => {
    setResultadosEditados({
      ...resultadosEditados,
      items: [
        ...resultadosEditados.items,
        { name: '', price: '0.00€' }
      ]
    });
  };

  // Añadir función para eliminar un ítem
  const removeItem = (index) => {
    const updatedItems = [...resultadosEditados.items];
    updatedItems.splice(index, 1);
    
    setResultadosEditados({
      ...resultadosEditados,
      items: updatedItems
    });
  };

  const guardarTicket = async () => {
    if (!resultadosEditados || !empleadoId) return;
    
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empleadoId,
          fecha: resultadosEditados.fecha,
          total: resultadosEditados.total,
          items: resultadosEditados.items,
          imagen: capturedImage
        }),
      });
      
      if (response.ok) {
        alert('Ticket guardado correctamente');
        window.location.href = `/empleados/${empleadoId}`;
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'No se pudo guardar el ticket'}`);
      }
    } catch (error) {
      console.error('Error al guardar ticket:', error);
      alert('Error al guardar el ticket');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Escáner de Tickets</h1>
            {empleado && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Empleado: {empleado.nombre} {empleado.apellidos}
              </p>
            )}
          </div>
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            Volver
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-md">
        {!empleadoId ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p>No se ha seleccionado ningún empleado. Por favor, selecciona un empleado antes de escanear un ticket.</p>
            <Link href="/" className="text-blue-500 hover:underline mt-2 inline-block">
              Volver a la lista de empleados
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
              {!capturedImage ? (
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => videoRef.current.play()}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={startCamera}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                    >
                      Iniciar Cámara
                    </button>
                    <button 
                      onClick={captureImage}
                      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                    >
                      Capturar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img 
                      src={capturedImage} 
                      alt="Ticket capturado" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button 
                    onClick={resetCapture}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                  >
                    Nueva Captura
                  </button>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                <div className="text-center p-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-2">Procesando imagen...</p>
                </div>
              </div>
            )}

            {results && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
                          onClick={addNewItem}
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
                            <>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                className="px-2 py-1 border rounded w-1/2"
                              />
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={item.price}
                                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                  className="px-2 py-1 border rounded w-24"
                                />
                                <button 
                                  onClick={() => removeItem(index)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  &times;
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span>{item.name}</span>
                              <span>{item.price}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button 
                    onClick={guardarTicket}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                  >
                    Guardar Ticket
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}