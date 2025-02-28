import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { priceId, planName } = await request.json();
    
    // Obtener usuario actual
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Obtener datos del usuario y su organización
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('*, organizations(*)')
      .eq('id', session.user.id)
      .single();
    
    if (!userData || !userData.organizations) {
      return NextResponse.json(
        { error: 'User profile or organization not found' },
        { status: 404 }
      );
    }
    
    const organizationId = userData.organization_id;
    const organization = userData.organizations;
    
    // Verificar si ya existe un cliente de Stripe
    let customerId = organization.stripe_customer_id;
    
    if (!customerId) {
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
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId);
    }
    
    // Crear sesión de checkout
    const checkoutSession = await stripeServer.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      metadata: {
        organizationId,
        planName,
      },
    });
    
    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}