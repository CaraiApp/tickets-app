import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// POST /api/empleados - Crear un empleado nuevo
export async function POST(request) {
  try {
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    console.log("Datos recibidos:", data); // Para debugging
    
    // Validaciones básicas
    if (!nombre || !apellidos || !dni) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Insertar empleado
    const { data: newEmpleado, error } = await supabase
      .from('empleados')
      .insert([
        { nombre, apellidos, dni, telefono, firma_url: firma }
      ])
      .select();
    
    if (error) {
      console.error("Error de Supabase:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log("Empleado creado:", newEmpleado);
    
    return NextResponse.json({ 
      id: newEmpleado?.[0]?.id,
      ...data,
      success: true
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear el empleado: ' + error.message },
      { status: 500 }
    );
  }
}