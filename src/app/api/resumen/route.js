// src/app/api/resumen/route.js
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  try {
    // Obtener total de empleados
    const { data: empleados, error: empError } = await supabase
      .from('empleados')
      .select('id');
    
    if (empError) throw empError;
    const totalEmpleados = empleados.length;
    
    // Obtener total de tickets y gasto
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('total');
    
    if (ticketsError) throw ticketsError;
    const totalTickets = tickets.length;
    const totalGastado = tickets.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
    
    // Media por empleado
    const mediaPorEmpleado = totalEmpleados > 0 ? (totalGastado / totalEmpleados) : 0;
    
    // Productos más consumidos
    const { data: items, error: itemsError } = await supabase
      .from('items_ticket')
      .select('descripcion, precio');
    
    if (itemsError) throw itemsError;
    
    const productosMap = {};
    items.forEach(item => {
      if (!productosMap[item.descripcion]) {
        productosMap[item.descripcion] = {
          nombre: item.descripcion,
          cantidad: 0,
          total: 0
        };
      }
      productosMap[item.descripcion].cantidad += 1;
      productosMap[item.descripcion].total += parseFloat(item.precio) || 0;
    });
    
    const productosMasConsumidos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
    
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