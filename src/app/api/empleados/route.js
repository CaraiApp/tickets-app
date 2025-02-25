import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/empleados - Obtener todos los empleados
export async function GET() {
  try {
    // Consulta mejorada que incluye el conteo de tickets y el total gastado por empleado
    const empleados = await query(`
      SELECT 
        e.*, 
        COUNT(t.id) as num_tickets, 
        COALESCE(SUM(t.total), 0) as total_gastado
      FROM 
        empleados e
      LEFT JOIN 
        tickets t ON e.id = t.empleado_id
      GROUP BY 
        e.id
    `);
    
    // Formatea los valores numéricos
    const formattedEmpleados = empleados.map(emp => ({
      ...emp,
      num_tickets: Number(emp.num_tickets || 0),
      total_gastado: Number(emp.total_gastado || 0)
    }));
    
    return NextResponse.json(formattedEmpleados);
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
    
    // Insertar en la base de datos
    const result = await query(
      'INSERT INTO empleados (nombre, apellidos, dni, telefono, firma_url) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellidos, dni, telefono, firma]
    );
    
    return NextResponse.json({ 
      id: result.insertId,
      nombre,
      apellidos,
      dni,
      telefono,
      success: true
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear el empleado' },
      { status: 500 }
    );
  }
}