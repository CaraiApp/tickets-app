import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { priceId, planName, userId } = await request.json();
    
    // Validar entradas
    if (!priceId || !planName) {
      return NextResponse.json(
        { error: 'Información de plan incompleta' },
        { status: 400 }
      );
    }
    
    // Obtener usuario actual
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || (userId && session.user.id !== userId)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener datos del usuario y su organización
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('*, organizations(*)')
      .eq('id', session.user.id)
      .single();
    
    if (userError || !userData || !userData.organizations) {
      console.error('Error obteniendo perfil de usuario:', userError);
      return NextResponse.json(
        { error: 'Perfil de usuario o organización no encontrados' },
        { status: 404 }
      );
    }
    
    const organizationId = userData.organization_id;
    const organization = userData.organizations;
    
    // Verificar si ya existe un cliente de Stripe
    let customerId = organization.stripe_customer_id;
    
    if (!customerId) {
      try {
        // Crear cliente en Stripe
        const customer = await stripeServer.customers.create({
          email: session.user.email,
          name: organization.name,
          metadata: {
            organizationId,
          },
        });
        
        customerId = customer.id;
        
        // Guardar ID de cliente en la base de datos
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', organizationId);
        
        if (updateError) {
          console.error('Error actualizando ID de cliente de Stripe:', updateError);
          // No es un error crítico, continuamos
        }
      } catch (customerError) {
        console.error('Error creando cliente de Stripe:', customerError);
        return NextResponse.json(
          { error: 'No se pudo crear el cliente de Stripe' },
          { status: 500 }
        );
      }
    }
    
    // Crear sesión de checkout
    try {
      const checkoutSession = await stripeServer.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true&plan=${encodeURIComponent(planName)}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
        metadata: {
          organizationId,
          planName,
          userId: session.user.id,
        },
        // Agregar más opciones de configuración si es necesario
        automatic_tax: { enabled: true },
        billing_address_collection: 'auto',
      });
      
      return NextResponse.json({ sessionId: checkoutSession.id });
    } catch (checkoutError) {
      console.error('Error creando sesión de checkout:', checkoutError);
      return NextResponse.json(
        { error: 'No se pudo crear la sesión de checkout' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error general en la creación de sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}