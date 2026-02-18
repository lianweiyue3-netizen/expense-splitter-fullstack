'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CurrencyOption,
  getClientCurrencyOptions,
  getInitialCurrencyOptions
} from '@/lib/currency-options';

type Props = {
  initialName: string;
  initialCurrency: string;
};

export function ProfileForm({ initialName, initialCurrency }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [defaultCurrencyCode, setDefaultCurrencyCode] =
    useState(initialCurrency);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>(
    getInitialCurrencyOptions(initialCurrency)
  );
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currencyBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!currencyBoxRef.current) {
        return;
      }
      if (!currencyBoxRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrencyOptions(getClientCurrencyOptions(initialCurrency));
  }, [initialCurrency]);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setStatus(null);
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, defaultCurrencyCode })
        });
        setIsLoading(false);
        setStatus(response.ok ? 'Saved' : 'Failed to save');
        if (response.ok) {
          router.push('/dashboard');
        }
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Your name</p>
          <span className="text-sm font-medium text-neutral-400">Edit</span>
        </div>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Your default currency</p>
          <span className="text-sm font-medium text-neutral-400">Edit</span>
        </div>
        <div className="relative" ref={currencyBoxRef}>
          <button
            className="flex w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm text-black"
            type="button"
            onClick={() => setIsCurrencyOpen((prev) => !prev)}
            aria-expanded={isCurrencyOpen}
            aria-haspopup="listbox"
          >
            <span>
              {currencyOptions.find(
                (option) => option.code === defaultCurrencyCode
              )?.label ?? defaultCurrencyCode}
            </span>
            <span className="text-xs text-neutral-500">▼</span>
          </button>
          {isCurrencyOpen ? (
            <ul
              className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-input bg-white py-1 text-sm text-black shadow-lg"
              role="listbox"
            >
              {currencyOptions.map((option) => (
                <li key={option.code}>
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-neutral-100"
                    type="button"
                    onClick={() => {
                      setDefaultCurrencyCode(option.code);
                      setIsCurrencyOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
      {status ? (
        <p className="text-sm text-muted-foreground">{status}</p>
      ) : null}
    </form>
  );
}
