import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase (usando admin key para evitar limitaciones de RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
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
    console.error(`Webhook Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // Manejar eventos específicos
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Extraer datos de metadata
        const { organizationId, planName } = session.metadata;
        
        // Actualizar la organización con el ID de suscripción
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_plan: planName.toLowerCase(),
            stripe_subscription_id: session.subscription,
            subscription_status: 'active'
          })
          .eq('id', organizationId);
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        // Registro exitoso de pago
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        // Actualizar estado si es necesario
        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
          
        if (organization && organization.subscription_status !== 'active') {
          await supabaseAdmin
            .from('organizations')
            .update({ subscription_status: 'active' })
            .eq('id', organization.id);
        }
        
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        // Marcar como fallido para notificar al usuario
        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
          
        if (organization) {
          await supabaseAdmin
            .from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('id', organization.id);
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Marcar como cancelado
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
              subscription_plan: 'free'
            })
            .eq('id', organization.id);
        }
        
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return NextResponse.json(
      { error: `Webhook handler failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// Permitir POST sin CSRF
export const config = {
  api: {
    bodyParser: false,
  },
};