import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
    const ticketResult = await query(
      'INSERT INTO tickets (empleado_id, fecha, total, imagen_url) VALUES (?, ?, ?, ?)',
      [empleadoId, fecha, parseFloat(total.replace('€', '')), imagen]
    );
    
    const ticketId = ticketResult.insertId;
    
    // Insertar items del ticket
    for (const item of items) {
      await query(
        'INSERT INTO items_ticket (ticket_id, descripcion, precio) VALUES (?, ?, ?)',
        [ticketId, item.name, parseFloat(item.price.replace('€', ''))]
      );
    }
    
    return NextResponse.json({ 
      id: ticketId,
      empleadoId,
      fecha,
      total,
      items
    });
  } catch (error) {
    console.error('Error al guardar ticket:', error);
    return NextResponse.json(
      { error: 'Error al guardar el ticket' },
      { status: 500 }
    );
  }
}