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
    priceId: null,
    features: [
      'Hasta 3 usuarios',
      '100 tickets mensuales',
      'Soporte básico por email',
    ],
    buttonText: 'Empezar gratis',
    popular: false,
    billingPeriod: 'mes'
  },
  {
    name: 'Pro',
    price: '29', // Precio mensual
    priceId: 'price_1QxQnIAMTKzwB6wRzsjxdwoG', // ID de precio mensual de Stripe
    features: [
      'Hasta 20 usuarios',
      'Tickets ilimitados',
      'Informes básicos',
      'Soporte prioritario',
    ],
    buttonText: 'Suscribirse al plan Pro',
    popular: true,
    billingPeriod: 'mes'
  },
  {
    name: 'Enterprise',
    price: '149', // Precio anual (149 * 12)
    priceId: 'price_1QxQolAMTKzwB6wRmQ1zf8ON', // ID de precio anual de Stripe
    features: [
      'Usuarios ilimitados',
      'Tickets ilimitados',
      'Informes avanzados',
      'Soporte 24/7',
    ],
    buttonText: 'Suscribirse al plan Enterprise',
    popular: false,
    billingPeriod: 'año'
  },
];

export { stripeServer };