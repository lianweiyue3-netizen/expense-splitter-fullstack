'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AuthProximityBackground } from '@/components/auth-proximity-background';
import { EqualPayLogo } from '@/components/equalpay-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setIsLoading(false);
      setError(body.error ?? 'Unable to create account');
      return;
    }

    await signIn('credentials', { email, password, redirect: false });
    setIsLoading(false);
    router.push('/onboarding');
  };

  return (
    <main className="relative min-h-screen text-white">
      <AuthProximityBackground imageUrl="/auth-bg.jpg" targetRef={cardRef} />
      <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
        <div className="fixed left-6 top-6 z-50">
          <EqualPayLogo className="text-white" href="/" />
        </div>
        <div ref={cardRef}>
          <Card className="w-full space-y-4 border border-white/80 bg-neutral-950 text-white">
            <h1 className="text-2xl font-semibold">Create account</h1>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <Button
                className="w-full bg-white text-black hover:bg-neutral-200"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? 'Creating...' : 'Create account'}
              </Button>
            </form>
            <p className="text-sm text-neutral-300">
              Already have an account?{' '}
              <Link className="text-primary underline" href="/login">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
