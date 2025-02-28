import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Usar el cliente de Supabase con contexto de autenticación
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar si el usuario está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener datos del request
    const data = await request.json();
    const { empleadoId, fecha, total, items, imagen } = data;
    
    if (!empleadoId || !fecha || !total || !items) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Obtener la organización del usuario actual
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Verificar que el empleado pertenece a la misma organización
    const { data: empleado } = await supabase
      .from('empleados')
      .select('organization_id')
      .eq('id', empleadoId)
      .single();
      
    if (!empleado || empleado.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }
    
    // 1. Insertar el ticket con organización
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .insert([{
        empleado_id: empleadoId,
        fecha,
        total: parseFloat(total.replace('€', '').replace(',', '.')),
        imagen_url: imagen,
        organization_id: userProfile.organization_id,
        created_by: session.user.id
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

// Añadir método GET para obtener tickets
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener parámetros de consulta si los hay
    const url = new URL(request.url);
    const empleadoId = url.searchParams.get('empleadoId');
    
    // Obtener organización del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Consultar tickets de la organización
    let query = supabase
      .from('tickets')
      .select('*, empleados(id, nombre, apellidos)')
      .eq('organization_id', userProfile.organization_id);
      
    // Filtrar por empleado si se especifica
    if (empleadoId) {
      query = query.eq('empleado_id', empleadoId);
    }
    
    // Ordenar por fecha (más reciente primero)
    query = query.order('fecha', { ascending: false });
    
    const { data: tickets, error } = await query;
    
    if (error) throw error;
    
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
    
    return NextResponse.json(ticketsConItems);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}