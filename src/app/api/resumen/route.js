import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Obtener total de empleados
    const [resEmpleados] = await query('SELECT COUNT(*) as total FROM empleados');
    const totalEmpleados = resEmpleados.total;
    
    // Obtener total de tickets y gasto
    const [resTickets] = await query('SELECT COUNT(*) as total_tickets, SUM(total) as total_gastado FROM tickets');
    const totalTickets = resTickets.total_tickets || 0;
    const totalGastado = resTickets.total_gastado || 0;
    
    // Calcular media por empleado
    const mediaPorEmpleado = totalEmpleados > 0 ? (totalGastado / totalEmpleados) : 0;
    
    // Obtener productos más consumidos
    const productosMasConsumidos = await query(`
      SELECT descripcion as nombre, COUNT(*) as cantidad, SUM(precio) as total
      FROM items_ticket
      GROUP BY descripcion
      ORDER BY cantidad DESC
      LIMIT 5
    `);
    
    return NextResponse.json({
      totalEmpleados,
      totalTickets,
      totalGastado,
      mediaPorEmpleado,
      productosMasConsumidos
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return NextResponse.json(
      { error: 'Error al obtener el resumen general' },
      { status: 500 }
    );
  }
}