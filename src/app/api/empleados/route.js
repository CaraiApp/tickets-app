import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener datos del empleado
    const { data: empleado, error: empleadoError } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', id)
      .single();
    
    if (empleadoError) throw empleadoError;
    
    // Obtener tickets del empleado
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('empleado_id', id);
    
    if (ticketsError) throw ticketsError;
    
    // Para cada ticket, obtener sus items
    const ticketsConItems = await Promise.all(
      tickets.map(async (ticket) => {
        const { data: items } = await supabase
          .from('items_ticket')
          .select('*')
          .eq('ticket_id', ticket.id);
        
        return {
          ...ticket,
          items_ticket: items || []
        };
      })
    );
    
    return NextResponse.json({
      empleado,
      tickets: ticketsConItems
    });
  } catch (error) {
    console.error('Error al obtener datos del empleado:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos del empleado', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // 1. Obtener todos los tickets del empleado
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id')
      .eq('empleado_id', id);
    
    if (ticketsError) throw ticketsError;
    
    // 2. Eliminar todos los items de cada ticket
    if (tickets.length > 0) {
      const ticketIds = tickets.map(t => t.id);
      
      const { error: itemsError } = await supabase
        .from('items_ticket')
        .delete()
        .in('ticket_id', ticketIds);
      
      if (itemsError) throw itemsError;
      
      // 3. Eliminar todos los tickets
      const { error: deleteTicketsError } = await supabase
        .from('tickets')
        .delete()
        .eq('empleado_id', id);
      
      if (deleteTicketsError) throw deleteTicketsError;
    }
    
    // 4. Finalmente eliminar al empleado
    const { error: empleadoError } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id);
    
    if (empleadoError) throw empleadoError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el empleado', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    const { error } = await supabase
      .from('empleados')
      .update({
        nombre,
        apellidos,
        dni,
        telefono,
        firma_url: firma
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el empleado', details: error.message },
      { status: 500 }
    );
  }
}