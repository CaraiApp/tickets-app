import { NextResponse } from 'next/server';
import { stripeServer } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { organizationId } = await request.json();
    
    // Obtener usuario actual
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verificar si el usuario tiene permiso para esta organización
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();
      
    if (!userProfile || userProfile.organization_id !== organizationId || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Obtener datos de la organización
    const { data: organization } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', organizationId)
      .single();
      
    if (!organization || !organization.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }
    
    // Cancelar suscripción en Stripe
    await stripeServer.subscriptions.cancel(organization.stripe_subscription_id);
    
    // Actualizar en base de datos
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'canceled',
        subscription_plan: 'free'
      })
      .eq('id', organizationId);
      
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}