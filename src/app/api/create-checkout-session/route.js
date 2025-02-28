import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  // Registro de inicio de la solicitud
  console.log('🔍 Inicio de solicitud de sesión de checkout');
  
  try {
    // Parsear el cuerpo de la solicitud con manejo de errores
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('✅ Cuerpo de la solicitud parseado:', requestBody);
    } catch (parseError) {
      console.error('❌ Error al parsear el cuerpo de la solicitud:', parseError);
      return NextResponse.json(
        { 
          error: 'Error al procesar la solicitud', 
          details: parseError.message 
        },
        { status: 400 }
      );
    }

    const { priceId, planName } = requestBody;
    
    // Validación detallada de inputs
    console.log('🕵️ Validando inputs:');
    console.log('- Price ID:', priceId);
    console.log('- Plan Name:', planName);

    if (!priceId) {
      console.warn('⚠️ Price ID es requerido');
      return NextResponse.json(
        { error: 'Price ID es requerido' },
        { status: 400 }
      );
    }

    // Configuración de Supabase
    const supabase = createRouteHandlerClient({ cookies });
    
    // Depuración de la sesión
    console.log('🔐 Verificando sesión de usuario');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('❌ Usuario no autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('👤 Información de sesión:');
    console.log('- User ID:', session.user.id);
    console.log('- Email:', session.user.email);

    // Obtener información de la organización
    console.log('🏢 Buscando organización del usuario');
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('❌ Error al buscar perfil de usuario:', userError);
      return NextResponse.json(
        { 
          error: 'Error al recuperar información de usuario', 
          details: userError 
        },
        { status: 500 }
      );
    }

    if (!userData || !userData.organization_id) {
      console.warn('⚠️ Organización no encontrada');
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 403 }
      );
    }

    console.log('🆔 ID de Organización:', userData.organization_id);

    // Verificación detallada del precio en Stripe
    console.log('💳 Verificando precio en Stripe');
    let stripePrice;
    try {
      stripePrice = await stripeServer.prices.retrieve(priceId);
      console.log('✅ Precio verificado:', JSON.stringify(stripePrice, null, 2));
    } catch (priceError) {
      console.error('❌ Error al verificar precio:', priceError);
      return NextResponse.json(
        { 
          error: 'ID de Precio inválido', 
          details: priceError.message,
          fullError: priceError
        },
        { status: 400 }
      );
    }

    // Crear sesión de checkout con depuración
    console.log('🚀 Creando sesión de checkout');
    let checkoutSession;
    try {
      checkoutSession = await stripeServer.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          organizationId: userData.organization_id,
          planName: planName,
          userId: session.user.id
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
        billing_address_collection: 'auto',
        customer_email: session.user.email,
      });

      console.log('✅ Sesión de checkout creada:');
      console.log('- Session ID:', checkoutSession.id);
      console.log('- Checkout URL:', checkoutSession.url);
    } catch (checkoutError) {
      console.error('❌ Error al crear sesión de checkout:', checkoutError);
      return NextResponse.json(
        { 
          error: 'No se pudo crear la sesión de pago', 
          details: checkoutError.message,
          fullError: checkoutError
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url 
    });

  } catch (error) {
    // Captura de errores general
    console.error('🔥 Error crítico:', error);
    
    return NextResponse.json(
      { 
        error: 'Error inesperado al procesar la suscripción',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}