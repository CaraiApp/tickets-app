import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener empleado
    const { data: empleado, error: empleadoError } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', id)
      .single();
    
    if (empleadoError) throw empleadoError;
    
    // Obtener tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('empleado_id', id)
      .order('fecha', { ascending: false });
    
    if (ticketsError) throw ticketsError;
    
    // Obtener items para cada ticket
    for (let ticket of tickets) {
      const { data: items, error: itemsError } = await supabase
        .from('items_ticket')
        .select('*')
        .eq('ticket_id', ticket.id);
      
      if (itemsError) throw itemsError;
      
      ticket.items = items;
    }
    
    // Calcular estadísticas
    const totalGastado = tickets.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
    
    // Productos más consumidos
    const productosMap = {};
    tickets.forEach(ticket => {
      ticket.items?.forEach(item => {
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
    });
    
    const productosMasConsumidos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
    
    return NextResponse.json({
      empleado,
      tickets,
      estadisticas: {
        totalGastado,
        numeroTickets: tickets.length,
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

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener tickets para este empleado
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('empleado_id', id);
    
    // Eliminar items y luego tickets
    if (tickets && tickets.length > 0) {
      const ticketIds = tickets.map(t => t.id);
      
      await supabase
        .from('items_ticket')
        .delete()
        .in('ticket_id', ticketIds);
      
      await supabase
        .from('tickets')
        .delete()
        .eq('empleado_id', id);
    }
    
    // Eliminar empleado
    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el empleado' },
      { status: 500 }
    );
  }
}