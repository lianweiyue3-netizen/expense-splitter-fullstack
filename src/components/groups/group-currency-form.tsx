'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CurrencyOption,
  getClientCurrencyOptions,
  getInitialCurrencyOptions
} from '@/lib/currency-options';

type Props = {
  groupId: string;
  initialCurrencyCode: string;
};

export function GroupCurrencyForm({ groupId, initialCurrencyCode }: Props) {
  const [currencyCode, setCurrencyCode] = useState(initialCurrencyCode);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>(
    getInitialCurrencyOptions(initialCurrencyCode)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setCurrencyOptions(getClientCurrencyOptions(initialCurrencyCode));
  }, [initialCurrencyCode]);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setStatus(null);

        const response = await fetch(`/api/groups/${groupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseCurrencyCode: currencyCode })
        });

        setIsLoading(false);
        setStatus(response.ok ? 'Saved group currency' : 'Failed to save');
      }}
    >
      <p className="text-sm font-medium">Group currency</p>
      <select
        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
        value={currencyCode}
        onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
      >
        {currencyOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        className="bg-white text-black hover:bg-neutral-200"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
      {status ? <p className="text-sm text-neutral-400">{status}</p> : null}
    </form>
  );
}
