import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  try {
    // Obtener total de empleados
    const { count: totalEmpleados, error: errorEmpleados } = await supabase
      .from('empleados')
      .select('*', { count: 'exact', head: true });
    
    if (errorEmpleados) {
      console.error('Error al obtener empleados:', errorEmpleados);
      return NextResponse.json(
        { error: errorEmpleados.message },
        { status: 500 }
      );
    }
    
    // Obtener total de tickets
    const { count: totalTickets, error: errorTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    
    if (errorTickets) {
      console.error('Error al obtener tickets:', errorTickets);
      return NextResponse.json(
        { error: errorTickets.message },
        { status: 500 }
      );
    }
    
    // Obtener suma de totales de tickets
    const { data: dataTickets, error: errorSuma } = await supabase
      .from('tickets')
      .select('total');
    
    if (errorSuma) {
      console.error('Error al obtener suma de tickets:', errorSuma);
      return NextResponse.json(
        { error: errorSuma.message },
        { status: 500 }
      );
    }
    
    // Calcular el total gastado
    const totalGastado = dataTickets.reduce((sum, ticket) => sum + (ticket.total || 0), 0);
    
    // Calcular media por empleado
    const mediaPorEmpleado = totalEmpleados > 0 ? (totalGastado / totalEmpleados) : 0;
    
    // Obtener todos los items para calcular productos más consumidos
    // (Supabase no soporta GROUP BY directamente como MySQL)
    const { data: itemsData, error: errorItems } = await supabase
      .from('items_ticket')
      .select('descripcion, precio');
    
    if (errorItems) {
      console.error('Error al obtener items:', errorItems);
      return NextResponse.json(
        { error: errorItems.message },
        { status: 500 }
      );
    }
    
    // Calcular productos más consumidos manualmente
    const productosMap = {};
    
    itemsData.forEach(item => {
      if (!productosMap[item.descripcion]) {
        productosMap[item.descripcion] = {
          nombre: item.descripcion,
          cantidad: 0,
          total: 0
        };
      }
      
      productosMap[item.descripcion].cantidad += 1;
      productosMap[item.descripcion].total += item.precio || 0;
    });
    
    // Convertir a array, ordenar y limitar a 5 resultados
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
      { error: 'Error al obtener el resumen general: ' + error.message },
      { status: 500 }
    );
  }
}