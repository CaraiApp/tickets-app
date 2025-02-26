import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/empleados - Obtener todos los empleados
export async function GET() {
  try {
    const { data: empleados, error } = await supabase
      .from('empleados')
      .select('*, tickets(id, total)');
    
    if (error) throw error;

    // Agregar cálculos de número de tickets y total gastado
    const empleadosConTotales = empleados.map(e => ({
      ...e,
      num_tickets: e.tickets ? e.tickets.length : 0,
      total_gastado: e.tickets ? e.tickets.reduce((sum, t) => sum + t.total, 0) : 0,
    }));

    return NextResponse.json(empleadosConTotales);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    return NextResponse.json(
      { error: 'Error al obtener los empleados' },
      { status: 500 }
    );
  }
}

// POST /api/empleados - Crear un empleado nuevo
export async function POST(request) {
  try {
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;

    // Validaciones básicas
    if (!nombre || !apellidos || !dni) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Insertar empleado en Supabase
    const { data: newEmpleado, error } = await supabase
      .from('empleados')
      .insert([{
        nombre,
        apellidos,
        dni,
        telefono,
        firma_url: firma
      }])
      .select();

    if (error) throw error;

    return NextResponse.json(newEmpleado[0]);
  } catch (error) {
    console.error('Error al crear empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear el empleado' },
      { status: 500 }
    );
  }
}
