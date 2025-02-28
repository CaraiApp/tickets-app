import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Obtener sesión y perfil de usuario
  const { data: { session } } = await supabase.auth.getSession();
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .single();

  // Filtrar empleados por organización
  const { data: empleados } = await supabase
    .from('empleados')
    .select('*')
    .eq('organization_id', userProfile.organization_id);

  return NextResponse.json(empleados);
}

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autorización
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener datos del request
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      );
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
    
    // Crear el empleado asociado a la organización
    const { data: newEmpleado, error } = await supabase
      .from('empleados')
      .insert([{
        nombre,
        apellidos,
        dni,
        telefono,
        firma_url: firma,
        organization_id: userProfile.organization_id,
        created_by: session.user.id
      }])
      .select();
    
    if (error) throw error;
    
    return NextResponse.json(newEmpleado[0]);
  } catch (error) {
    console.error('Error creating empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear el empleado', details: error.message },
      { status: 500 }
    );
  }
}