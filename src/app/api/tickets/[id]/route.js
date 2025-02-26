import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/tickets/[id] - Obtener un ticket específico
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener datos del ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener items del ticket
    const { data: items, error: itemsError } = await supabase
      .from('items_ticket')
      .select('*')
      .eq('ticket_id', id);
    
    if (itemsError) {
      console.error('Error al obtener items del ticket:', itemsError);
      return NextResponse.json(
        { error: 'Error al obtener los items del ticket' },
        { status: 500 }
      );
    }
    
    // Formatear los datos para asegurar la compatibilidad
    const formattedTicket = {
      ...ticket,
      // Aseguramos que total sea un número si es posible
      total: typeof ticket.total === 'string' && !isNaN(parseFloat(ticket.total.replace('€', ''))) 
        ? parseFloat(ticket.total.replace('€', '')) 
        : ticket.total,
    };
    
    // Formatear los items
    const formattedItems = items.map(item => ({
      ...item,
      // Aseguramos que precio sea un número si es posible
      precio: typeof item.precio === 'string' && !isNaN(parseFloat(item.precio.replace('€', '')))
        ? parseFloat(item.precio.replace('€', ''))
        : item.precio,
    }));
    
    return NextResponse.json({
      ticket: {
        ...formattedTicket,
        items: formattedItems
      }
    });
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos del ticket: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Eliminar un ticket
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Primero, eliminar los items del ticket
    const { error: itemsDeleteError } = await supabase
      .from('items_ticket')
      .delete()
      .eq('ticket_id', id);
    
    if (itemsDeleteError) {
      console.error('Error al eliminar items del ticket:', itemsDeleteError);
      return NextResponse.json(
        { error: 'Error al eliminar los items del ticket: ' + itemsDeleteError.message },
        { status: 500 }
      );
    }
    
    // Luego, eliminar el ticket
    const { error: ticketDeleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);
    
    if (ticketDeleteError) {
      console.error('Error al eliminar ticket:', ticketDeleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el ticket: ' + ticketDeleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el ticket: ' + error.message },
      { status: 500 }
    );
  }
}