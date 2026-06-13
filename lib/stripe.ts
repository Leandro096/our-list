import Stripe from 'stripe';

// Singleton server-side Stripe client (test or live key via env).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
});
