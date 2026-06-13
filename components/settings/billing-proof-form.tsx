'use client';

import { Upload } from 'lucide-react';
import { useRef, useReducer } from 'react';

import { toast } from '@/hooks';
import { submitPaymentProofAction } from '@/app/dashboard/settings/billing/actions';

import {
  Card,
  Input,
  Label,
  Button,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from '@/components/ui';

interface Props {
  tenantId: string;
  planId: string;
  subscriptionId: string | null;
  billingType: 'one_time' | 'recurring';
}

type State = {
  amount: string;
  currency: string;
  reference: string;
  file: File | null;
  isSubmitting: boolean;
};

type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function BillingProofForm({ planId, subscriptionId, billingType }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    amount: '',
    currency: 'USD',
    reference: '',
    file: null,
    isSubmitting: false,
  });

  const { amount, currency, reference, file, isSubmitting } = state;
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: 'Error',
        description: 'Debes adjuntar un comprobante.',
        variant: 'destructive',
      });
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      toast({ title: 'Error', description: 'Ingresa un monto válido.', variant: 'destructive' });
      return;
    }

    update({ isSubmitting: true });

    const formData = new FormData();
    formData.set('proof', file);

    const result = await submitPaymentProofAction(formData, {
      planId,
      subscriptionId,
      amount: parseFloat(amount),
      currency,
      reference: reference.trim() || null,
      billingType,
    });

    update({ isSubmitting: false });

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Pago enviado', description: 'Lo revisaremos pronto.' });
      update({ amount: '', reference: '', file: null });
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar comprobante de pago</CardTitle>
        <CardDescription>
          Sube tu comprobante de transferencia bancaria para activar o renovar tu suscripción.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => update({ amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                type="text"
                placeholder="USD"
                maxLength={3}
                value={currency}
                onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia bancaria (opcional)</Label>
            <Input
              id="reference"
              type="text"
              placeholder="Nº de transacción o referencia"
              value={reference}
              onChange={(e) => update({ reference: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof-file">Comprobante</Label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="proof-file"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
              >
                <Upload className="h-4 w-4" />
                {file ? file.name : 'Seleccionar archivo'}
              </label>
              <input
                ref={fileRef}
                id="proof-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={(e) => update({ file: e.target.files?.[0] ?? null })}
              />
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP o PDF · máx 10 MB</p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Enviando...' : 'Enviar comprobante'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
