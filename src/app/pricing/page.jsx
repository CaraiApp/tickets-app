'use client';

import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { getStripe, pricingPlans } from '@/lib/stripe';
import Link from 'next/link';

// Componente separado para el contenido de la página
function PricingContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Mostrar mensaje si se cancela el checkout
  useEffect(() => {
    if (searchParams.get('canceled')) {
      setMessage('Se canceló el proceso de pago. Puedes intentarlo nuevamente cuando estés listo.');
    }
    
    if (searchParams.get('success')) {
      setMessage('¡Suscripción realizada con éxito! Tu plan ha sido actualizado.');
    }
  }, [searchParams]);

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    
    checkSession();
  }, []);

  const handleSubscription = async (priceId, planName) => {
    setLoading(true);
    setMessage('');
    
    console.log('🚀 Iniciando suscripción');
    console.log('- Price ID:', priceId);
    console.log('- Plan Name:', planName);
  
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planName,
        }),
      });
  
      console.log('📡 Respuesta del servidor:', response);
      const responseData = await response.json();
      console.log('📊 Datos de respuesta:', responseData);
  
      if (!response.ok) {
        console.error('❌ Error en la respuesta:', responseData);
        setMessage(responseData.error || 'Error al procesar');
        return;
      }
  
      const { sessionId, checkoutUrl } = responseData;
      console.log('🔑 Session ID:', sessionId);
      console.log('🌐 Checkout URL:', checkoutUrl);
      
      const stripe = await getStripe();
      await stripe.redirectToCheckout({ sessionId });
      
    } catch (error) {
      console.error('🔥 Error completo:', error);
      setMessage('Error al procesar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Navbar básico */}
      <nav className="flex justify-between items-center mb-12">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Ticket Lucrapp
        </Link>
        
        <div>
          {session ? (
            <Link href="/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
              Dashboard
            </Link>
          ) : (
            <div className="flex space-x-4">
              <Link href="/login" className="text-blue-600 hover:text-blue-800">
                Iniciar sesión
              </Link>
              <Link href="/register" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Planes y Precios</h1>
        <p className="text-xl text-gray-600">
          Elige el plan que mejor se adapte a las necesidades de tu empresa
        </p>
      </div>
      
      {message && (
        <div className={`mb-8 p-4 text-center rounded-md ${
          message.includes('éxito') 
            ? 'bg-green-100 text-green-700 border border-green-300' 
            : 'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          {message}
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-8">
        {pricingPlans.map((plan) => (
          <div 
            key={plan.name}
            className={`border rounded-lg p-8 ${
              plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Popular
              </span>
            )}
            
            <h2 className="text-2xl font-bold mt-4">{plan.name}</h2>
            
            <div className="mt-4 mb-8">
              <span className="text-4xl font-bold">€{plan.price}</span>
              <span className="text-gray-500">
                {plan.billingPeriod ? `/${plan.billingPeriod}` : '/año'}
              </span>
            </div>
            
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center">
                  <svg 
                    className="h-5 w-5 text-green-500 mr-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSubscription(plan.priceId, plan.name)}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md ${
                plan.popular
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {loading ? 'Procesando...' : plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Añade este bloque al final del archivo, fuera de cualquier otro componente
export default function PricingPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PricingContent />
    </Suspense>
  );
}