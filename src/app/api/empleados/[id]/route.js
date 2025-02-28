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
    
    // Obtener datos del empleado verificando que pertenece a la organización
    const { data: empleado, error: empleadoError } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .single();
    
    if (empleadoError) {
      if (empleadoError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      throw empleadoError;
    }
    
    // Obtener tickets del empleado
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('empleado_id', id)
      .eq('organization_id', userProfile.organization_id);
    
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
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener organización del usuario y verificar rol
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Verificar que el empleado pertenece a la organización
    const { data: empleado, error: empleadoCheckError } = await supabase
      .from('empleados')
      .select('organization_id')
      .eq('id', id)
      .single();
    
    if (empleadoCheckError) {
      if (empleadoCheckError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      throw empleadoCheckError;
    }
    
    if (empleado.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // 1. Obtener todos los tickets del empleado en esta organización
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id')
      .eq('empleado_id', id)
      .eq('organization_id', userProfile.organization_id);
    
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
        .eq('empleado_id', id)
        .eq('organization_id', userProfile.organization_id);
      
      if (deleteTicketsError) throw deleteTicketsError;
    }
    
    // 4. Finalmente eliminar al empleado
    const { error: empleadoError } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id);
    
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
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener datos del request
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    // Obtener organización del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }
    
    // Verificar que el empleado pertenece a la organización
    const { data: empleado, error: checkError } = await supabase
      .from('empleados')
      .select('organization_id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      throw checkError;
    }
    
    if (empleado.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Actualizar el empleado
    const { error } = await supabase
      .from('empleados')
      .update({
        nombre,
        apellidos,
        dni,
        telefono,
        firma_url: firma
      })
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id);
    
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