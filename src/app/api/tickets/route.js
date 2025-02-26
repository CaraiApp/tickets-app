// src/app/api/tickets/route.js
import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// POST /api/tickets - Guardar un nuevo ticket
export async function POST(request) {
  try {
    const data = await request.json();
    const { empleadoId, fecha, total, items, imagen } = data;
    
    // Validaciones básicas
    if (!empleadoId || !fecha || !total || !items) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Insertar ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .insert([{
        empleado_id: empleadoId,
        fecha,
        total: parseFloat(total.replace('€', '')),
        imagen_url: imagen
      }])
      .select();
    
    if (ticketError) throw ticketError;
    
    const ticketId = ticketData[0].id;
    
    // Insertar items del ticket
    const itemsToInsert = items.map(item => ({
      ticket_id: ticketId,
      descripcion: item.name,
      precio: parseFloat(item.price.replace('€', '')),
      cantidad: 1
    }));
    
    const { error: itemsError } = await supabase
      .from('items_ticket')
      .insert(itemsToInsert);
    
    if (itemsError) throw itemsError;
    
    return NextResponse.json({ 
      id: ticketId,
      empleadoId,
      fecha,
      total,
      items,
      success: true
    });
  } catch (error) {
    console.error('Error al guardar ticket:', error);
    return NextResponse.json(
      { error: 'Error al guardar el ticket' },
      { status: 500 }
    );
  }
}