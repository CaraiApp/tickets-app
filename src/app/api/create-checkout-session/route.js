import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { priceId, planName } = await request.json();
    
    // Log adicional para depuración
    console.log('Received priceId:', priceId);
    console.log('Received planName:', planName);
    
    // Validación de entradas
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID es requerido' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificación adicional de precio en Stripe
    const price = await stripeServer.prices.retrieve(priceId);
    console.log('Precio verificado:', price);

    // Crear sesión de checkout
    const checkoutSession = await stripeServer.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ sessionId: checkoutSession.id });

  } catch (error) {
    // Log detallado del error
    console.error('Error completo:', error);
    
    return NextResponse.json(
      { 
        error: 'No se pudo crear la sesión de pago',
        details: error.message,
        // Opcional: incluir más detalles del error para depuración
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}