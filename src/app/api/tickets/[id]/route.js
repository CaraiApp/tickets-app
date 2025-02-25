import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/tickets/[id] - Obtener un ticket específico
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener datos del ticket
    const [ticket] = await query('SELECT * FROM tickets WHERE id = ?', [id]);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener items del ticket
    const items = await query('SELECT * FROM items_ticket WHERE ticket_id = ?', [id]);
    
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
      { error: 'Error al obtener los datos del ticket' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Eliminar un ticket
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Primero, eliminar los items del ticket
    await query('DELETE FROM items_ticket WHERE ticket_id = ?', [id]);
    
    // Luego, eliminar el ticket
    const result = await query('DELETE FROM tickets WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el ticket' },
      { status: 500 }
    );
  }
}