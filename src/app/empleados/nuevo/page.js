"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function NuevoEmpleado() {
  const router = useRouter();
  const [empleado, setEmpleado] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    telefono: ''
  });

  const [firmando, setFirmando] = useState(false);
  const [firma, setFirma] = useState(null);
  const canvasRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [posicionPrevia, setPosicionPrevia] = useState({ x: 0, y: 0 });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpleado(prev => ({ ...prev, [name]: value }));
  };

  const iniciarFirma = () => {
    setFirmando(true);
    setTimeout(() => {
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, 100);
  };

  const comenzarDibujo = (e) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    setDibujando(true);
    setPosicionPrevia({ x, y });
  };

  const dibujar = (e) => {
    if (!dibujando || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    context.beginPath();
    context.moveTo(posicionPrevia.x, posicionPrevia.y);
    context.lineTo(x, y);
    context.strokeStyle = '#000';
    context.lineWidth = 2;
    context.stroke();

    setPosicionPrevia({ x, y });
  };

  const limpiarFirma = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const terminarDibujo = () => {
    setDibujando(false);
  };

  const guardarFirma = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const firmaDataUrl = canvas.toDataURL('image/png');
    setFirma(firmaDataUrl);
    setFirmando(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!firma) {
      alert('Por favor, añade una firma antes de guardar');
      return;
    }
  
    try {
      // Obtener la organización del usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();
  
      const { data, error } = await supabase
        .from('empleados')
        .insert([
          {
            nombre: empleado.nombre,
            apellidos: empleado.apellidos,
            dni: empleado.dni,
            telefono: empleado.telefono,
            firma_url: firma,
            organization_id: userProfile.organization_id // Añadir organization_id
          }
        ])
        .select();
  
      if (error) throw error;
  
      alert('Empleado guardado correctamente');
      router.push('/dashboard'); // Redirigir al dashboard
    } catch (error) {
      console.error('Error al guardar el empleado:', error);
      alert('Error al guardar el empleado');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Nuevo Empleado</h1>
          <Link href="/dashboard" className="text-blue-500 hover:text-blue-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {['nombre', 'apellidos', 'dni', 'telefono'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="text"
                  name={field}
                  value={empleado[field]}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Firma
              </label>
              {firma ? (
                <div className="mb-4">
                  <img src={firma} alt="Firma del empleado" className="border border-gray-300 rounded-md w-full" />
                  <button type="button" onClick={() => setFirma(null)} className="mt-2 text-sm text-red-500">
                    Eliminar firma
                  </button>
                </div>
              ) : (
                <button type="button" onClick={iniciarFirma} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded">
                  Añadir firma
                </button>
              )}
            </div>

            <div className="flex justify-end">
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded">
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>

      {firmando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Firma del empleado</h2>

            <div className="border border-gray-300 rounded-md overflow-hidden mb-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full bg-white"
                onMouseDown={comenzarDibujo}
                onMouseMove={dibujar}
                onMouseUp={terminarDibujo}
                onMouseLeave={terminarDibujo}
                onTouchStart={comenzarDibujo}
                onTouchMove={dibujar}
                onTouchEnd={terminarDibujo}
              />
            </div>

            <div className="flex justify-between">
              <button onClick={limpiarFirma} className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded">
                Limpiar
              </button>

              <div>
                <button onClick={() => setFirmando(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded mr-2">
                  Cancelar
                </button>

                <button onClick={guardarFirma} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}