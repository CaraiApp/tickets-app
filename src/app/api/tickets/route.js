import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(request) {
  try {
    const data = await request.json();
    const { empleadoId, fecha, total, items, imagen } = data;
    
    if (!empleadoId || !fecha || !total || !items) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // 1. Insertar el ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .insert([{
        empleado_id: empleadoId,
        fecha,
        total: parseFloat(total.replace('€', '').replace(',', '.')),
        imagen_url: imagen
      }])
      .select();
    
    if (ticketError) throw ticketError;
    
    const ticketId = ticketData[0].id;
    
    // 2. Insertar los items del ticket
    const itemsToInsert = items.map(item => ({
      ticket_id: ticketId,
      descripcion: item.name,
      precio: parseFloat(item.price.replace('€', '').replace(',', '.')),
      cantidad: 1
    }));
    
    const { error: itemsError } = await supabase
      .from('items_ticket')
      .insert(itemsToInsert);
    
    if (itemsError) throw itemsError;
    
    return NextResponse.json({ 
      success: true,
      ticket: ticketData[0]
    });
  } catch (error) {
    console.error('Error al guardar ticket:', error);
    return NextResponse.json(
      { error: 'Error al guardar el ticket', details: error.message },
      { status: 500 }
    );
  }
}