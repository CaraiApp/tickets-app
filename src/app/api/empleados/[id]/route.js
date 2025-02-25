import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    // Validaciones básicas
    if (!nombre || !apellidos || !dni) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Actualizar empleado en la base de datos
    const result = await query(
      'UPDATE empleados SET nombre = ?, apellidos = ?, dni = ?, telefono = ?, firma_url = ? WHERE id = ?',
      [nombre, apellidos, dni, telefono, firma, id]
    );
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado o no se realizaron cambios' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      id,
      nombre,
      apellidos,
      dni,
      telefono
    });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    return NextResponse.json(
      { error: `Error al actualizar el empleado: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Primero, eliminar todos los artículos de los tickets del empleado
    await query(`
      DELETE it FROM items_ticket it
      JOIN tickets t ON it.ticket_id = t.id
      WHERE t.empleado_id = ?
    `, [id]);
    
    // Luego, eliminar los tickets del empleado
    await query('DELETE FROM tickets WHERE empleado_id = ?', [id]);
    
    // Finalmente, eliminar al empleado
    const result = await query('DELETE FROM empleados WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el empleado' },
      { status: 500 }
    );
  }
}
// GET /api/empleados/[id] - Obtener un empleado específico
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener datos del empleado
    const [empleado] = await query('SELECT * FROM empleados WHERE id = ?', [id]);
    
    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener tickets del empleado
    const tickets = await query('SELECT * FROM tickets WHERE empleado_id = ? ORDER BY fecha DESC', [id]);
    
    // Obtener items de los tickets
    for (const ticket of tickets) {
      ticket.items = await query('SELECT * FROM items_ticket WHERE ticket_id = ?', [ticket.id]);
    }
    
    // Obtener estadísticas
    const [estadisticas] = await query(`
      SELECT COUNT(id) as total_tickets, SUM(total) as total_gastado
      FROM tickets
      WHERE empleado_id = ?
    `, [id]);
    
    // Obtener productos más consumidos
    const productosMasConsumidos = await query(`
      SELECT descripcion as nombre, COUNT(*) as cantidad, SUM(precio) as total
      FROM items_ticket it
      JOIN tickets t ON it.ticket_id = t.id
      WHERE t.empleado_id = ?
      GROUP BY descripcion
      ORDER BY cantidad DESC
      LIMIT 5
    `, [id]);
    
    return NextResponse.json({
      empleado,
      tickets,
      estadisticas: {
        totalGastado: estadisticas.total_gastado || 0,
        numeroTickets: estadisticas.total_tickets || 0,
        productosMasConsumidos
      }
    });
  } catch (error) {
    console.error('Error al obtener datos del empleado:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos del empleado' },
      { status: 500 }
    );
  }
}