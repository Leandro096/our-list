import Stripe from 'stripe';

// Singleton server-side Stripe client (test or live key via env).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
});
