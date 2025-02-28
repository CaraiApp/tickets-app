import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener organización del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Obtener ticket y verificar que pertenece a la organización del usuario
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, empleados(id, nombre, apellidos)')
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .single();
    
    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      throw ticketError;
    }
    
    // Obtener items del ticket
    const { data: items, error: itemsError } = await supabase
      .from('items_ticket')
      .select('*')
      .eq('ticket_id', id);
    
    if (itemsError) throw itemsError;
    
    return NextResponse.json({
      ...ticket,
      items_ticket: items || []
    });
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    return NextResponse.json(
      { error: 'Error al obtener el ticket', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener organización del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Verificar que el ticket pertenece a la organización del usuario
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('organization_id')
      .eq('id', id)
      .single();
    
    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      throw ticketError;
    }
    
    if (ticket.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Eliminar primero los items del ticket
    const { error: itemsError } = await supabase
      .from('items_ticket')
      .delete()
      .eq('ticket_id', id);
    
    if (itemsError) throw itemsError;
    
    // Luego eliminar el ticket
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el ticket', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener datos del request
    const data = await request.json();
    
    // Obtener organización del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Verificar que el ticket pertenece a la organización del usuario
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('organization_id')
      .eq('id', id)
      .single();
    
    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      throw ticketError;
    }
    
    if (ticket.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Actualizar el ticket
    const { error: updateError } = await supabase
      .from('tickets')
      .update(data)
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el ticket', details: error.message },
      { status: 500 }
    );
  }
}