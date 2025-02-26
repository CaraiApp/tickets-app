"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

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
  const router = useRouter();
  const empleadoId = searchParams.get("empleadoId");

  const [empleado, setEmpleado] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [editandoResultados, setEditandoResultados] = useState(false);
  const [resultadosEditados, setResultadosEditados] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Cargar datos del empleado desde Supabase
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageData);
    stopCamera();
    processImage(imageData);
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
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert([
          {
            empleado_id: empleadoId,
            fecha: resultadosEditados.fecha,
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
        cantidad: 1,
      }));

      const { error: itemsError } = await supabase
        .from("items_ticket")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert("Ticket guardado correctamente");
      router.push(`/empleados/${empleadoId}`);
    } catch (error) {
      console.error("Error al guardar ticket:", error);
      alert("Error al guardar el ticket.");
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
          <div className="mt-6">
            <button onClick={guardarTicket} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded w-full">
              Guardar Ticket
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
