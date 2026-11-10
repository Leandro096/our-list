'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { formatPhone, maskPhoneInput } from '@/lib/phone';

type PhoneInputProps = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
};

/** Masked input for US / Dominican numbers: +1 (###) ###-#### (the +1 is added automatically). */
function PhoneInput({ value, onValueChange, placeholder, ...props }: PhoneInputProps) {
  const display = formatPhone(value);
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      maxLength={17}
      placeholder={placeholder ?? '+1 (809) 555-0100'}
      value={display}
      onChange={(e) => onValueChange(maskPhoneInput(e.target.value, display))}
    />
  );
}

export { PhoneInput };
