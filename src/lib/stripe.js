import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Cliente de Stripe del lado del servidor (solo para API routes)
let stripeServer;

if (typeof window === 'undefined') {
  stripeServer = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

// Cliente de Stripe del lado del cliente (para checkout)
let stripePromise;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Definición de planes (mantén los IDs actualizados con los de tu dashboard de Stripe)
export const pricingPlans = [
  {
    name: 'Free',
    price: '0',
    priceId: null, // No necesitamos ID para el plan gratuito
    features: [
      'Hasta 3 usuarios',
      '100 tickets mensuales',
      'Soporte básico por email',
    ],
    buttonText: 'Empezar gratis',
    popular: false,
  },
  {
    name: 'Pro',
    price: '29',
    priceId: 'prod_Rr95SShT1eDMMj', // Reemplaza con tu ID real
    features: [
      'Hasta 20 usuarios',
      'Tickets ilimitados',
      'Informes básicos',
      'Soporte prioritario',
    ],
    buttonText: 'Suscribirse al plan Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '149',
    priceId: 'prod_Rr96sFD4tVkmut', // Reemplaza con tu ID real
    features: [
      'Usuarios ilimitados',
      'Tickets ilimitados',
      'Informes avanzados',
      'Soporte 24/7',
    ],
    buttonText: 'Suscribirse al plan Enterprise',
    popular: false,
  },
];

export { stripeServer };