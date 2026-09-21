import Stripe from 'stripe';

// Lazy singleton. Instantiating Stripe at module load with a missing
// STRIPE_SECRET_KEY throws — which would break the ENTIRE billing actions
// module (including bank-transfer flows that don't use Stripe at all). Creating
// it on first use keeps the module importable without Stripe configured.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY no está configurada. Configúrala para usar pagos con tarjeta (Stripe).'
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  });
  return _stripe;
}
