import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  console.log('🌟 Webhook de Stripe recibido');

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  let event;
  
  try {
    event = stripeServer.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('🚨 Error de validación de webhook:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Invalid webhook signature', 
        details: error.message 
      }, 
      { status: 400 }
    );
  }

  console.log(`🔔 Tipo de evento recibido: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('✅ Checkout completado:', session);
        
        const { organizationId, planName } = session.metadata || {};
        
        if (!organizationId) {
          console.warn('⚠️ No se encontró organizationId en los metadatos');
          return NextResponse.json({ received: true });
        }

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_plan: planName?.toLowerCase() || 'free',
            stripe_subscription_id: session.subscription,
            subscription_status: 'active'
          })
          .eq('id', organizationId);
        
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('🔄 Suscripción creada/actualizada:', subscription);

        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        if (organization) {
          await supabaseAdmin
            .from('organizations')
            .update({
              subscription_status: subscription.status,
              subscription_plan: subscription.plan?.nickname?.toLowerCase() || 'free'
            })
            .eq('id', organization.id);
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('💰 Pago exitoso:', invoice);
        
        const subscriptionId = invoice.subscription;
        
        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
          
        if (organization) {
          await supabaseAdmin
            .from('organizations')
            .update({ 
              subscription_status: 'active',
              last_payment_date: new Date().toISOString()
            })
            .eq('id', organization.id);
        }
        
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('❌ Pago fallido:', invoice);
        
        const subscriptionId = invoice.subscription;
        
        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
          
        if (organization) {
          await supabaseAdmin
            .from('organizations')
            .update({ 
              subscription_status: 'past_due',
              failed_payments_count: (organization.failed_payments_count || 0) + 1
            })
            .eq('id', organization.id);
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('❌ Suscripción cancelada:', subscription);
        
        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();
          
        if (organization) {
          await supabaseAdmin
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              subscription_plan: 'free',
              cancellation_date: new Date().toISOString()
            })
            .eq('id', organization.id);
        }
        
        break;
      }
      
      default: {
        console.log(`📌 Evento no manejado: ${event.type}`);
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('💥 Error procesando webhook:', {
      message: error.message,
      type: event.type,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Webhook handler failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Configuración para deshabilitar body parser
export const config = {
  api: {
    bodyParser: false,
  },
};