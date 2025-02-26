import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // 1. Primero eliminamos los items del ticket
    const { error: itemsError } = await supabase
      .from('items_ticket')
      .delete()
      .eq('ticket_id', id);
    
    if (itemsError) throw itemsError;
    
    // 2. Luego eliminamos el ticket
    const { error: ticketError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);
    
    if (ticketError) throw ticketError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el ticket', details: error.message },
      { status: 500 }
    );
  }
}