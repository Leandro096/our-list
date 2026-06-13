'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@/hooks';
import { togglePlanActiveAction, updateStripePriceIdAction } from '@/app/admin/plans/actions';

import { Input, Button, Switch } from '@/components/ui';

interface Props {
  planId: string;
  isActive: boolean;
  stripePriceId: string | null;
}

type State = { priceId: string; editing: boolean; saving: boolean; toggling: boolean };
type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function PlanRowActions({ planId, isActive, stripePriceId }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    priceId: stripePriceId ?? '',
    editing: false,
    saving: false,
    toggling: false,
  });
  const { priceId, editing, saving, toggling } = state;
  const update = (payload: Partial<State>) => dispatch({ type: 'UPDATE', payload });

  const handleToggle = async (checked: boolean) => {
    update({ toggling: true });
    const result = await togglePlanActiveAction(planId, checked);
    update({ toggling: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      router.refresh();
    }
  };

  const handleSavePriceId = async () => {
    update({ saving: true });
    const result = await updateStripePriceIdAction(planId, priceId);
    update({ saving: false, editing: false });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ description: 'Stripe Price ID actualizado.' });
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={handleToggle} disabled={toggling} />
        <span className="text-xs text-muted-foreground">{isActive ? 'Activo' : 'Inactivo'}</span>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            value={priceId}
            onChange={(e) => update({ priceId: e.target.value })}
            placeholder="price_..."
            className="h-7 text-xs"
          />
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSavePriceId}
            disabled={saving}
          >
            {saving ? '…' : 'OK'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => update({ editing: false, priceId: stripePriceId ?? '' })}
          >
            ✕
          </Button>
        </div>
      ) : (
        <button
          onClick={() => update({ editing: true })}
          className="text-left text-xs text-muted-foreground hover:text-foreground truncate max-w-[160px]"
        >
          {priceId || <span className="italic">Sin Stripe Price ID</span>}
        </button>
      )}
    </div>
  );
}
