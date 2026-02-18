'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthProximityBackground } from '@/components/auth-proximity-background';
import { EqualPayLogo } from '@/components/equalpay-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);
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
    setIsLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    setIsLoading(false);
    if (!result || result.error) {
      setError(
        "Oh no! We couldn't find an account for that email address and password."
      );
      return;
    }

    router.push('/dashboard');
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
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <Button
                className="w-full bg-white text-black hover:bg-neutral-200"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <p className="text-sm text-neutral-300">
              New here?{' '}
              <Link className="text-primary underline" href="/signup">
                Create an account
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
