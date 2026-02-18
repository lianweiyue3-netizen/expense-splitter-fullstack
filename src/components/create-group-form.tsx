'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CurrencyOption,
  getClientCurrencyOptions,
  getInitialCurrencyOptions
} from '@/lib/currency-options';

type Props = {
  initialCurrencyCode: string;
};

const DEFAULT_GROUP_ICON_URL = '/group-default-icon.svg';

export function CreateGroupForm({ initialCurrencyCode }: Props) {
  const normalizedInitialCurrencyCode = initialCurrencyCode.toUpperCase();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(normalizedInitialCurrencyCode);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>(
    getInitialCurrencyOptions(normalizedInitialCurrencyCode)
  );
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [iconUrl, setIconUrl] = useState(DEFAULT_GROUP_ICON_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currencyBoxRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

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
    setCurrencyOptions(getClientCurrencyOptions(normalizedInitialCurrencyCode));
    setCurrency(normalizedInitialCurrencyCode);
  }, [normalizedInitialCurrencyCode]);

  const handleIconUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 1_500_000) {
      setError('Image is too large. Please use an image smaller than 1.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setIconUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, baseCurrencyCode: currency, iconUrl })
        });

        const body = (await response.json()) as {
          group?: { id: string };
          error?: string;
        };
        setIsLoading(false);
        if (!response.ok || !body.group) {
          setError(body.error ?? 'Could not create group');
          return;
        }

        setName('');
        setIconUrl(DEFAULT_GROUP_ICON_URL);
        router.push(`/groups/${body.group.id}`);
      }}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">Group icon</p>
        <div className="flex items-center gap-3">
          <img
            alt="Group icon preview"
            className="h-14 w-14 rounded-full border border-neutral-700 object-cover"
            src={iconUrl}
          />
          <button
            className="rounded-md border border-neutral-600 bg-white px-3 py-2 text-sm text-black hover:bg-neutral-100"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload image
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          onChange={handleIconUpload}
        />
      </div>

      <Input
        className="bg-white text-black placeholder:text-neutral-500"
        placeholder="Group name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <div className="relative" ref={currencyBoxRef}>
        <button
          className="flex w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm text-black"
          type="button"
          onClick={() => setIsCurrencyOpen((prev) => !prev)}
          aria-expanded={isCurrencyOpen}
          aria-haspopup="listbox"
        >
          <span>
            {currencyOptions.find((option) => option.code === currency)
              ?.label ?? currency}
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
                    setCurrency(option.code);
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
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Group'}
      </Button>
    </form>
  );
}
