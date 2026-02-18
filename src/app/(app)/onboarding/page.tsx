import { Card } from '@/components/ui/card';
import { ProfileForm } from '@/components/profile-form';
import { requireAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function OnboardingPage() {
  const session = await requireAuthSession();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id }
  });

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl font-semibold">Set up your profile</h1>
      <Card>
        <ProfileForm
          initialName={user.name}
          initialCurrency={user.defaultCurrencyCode}
        />
      </Card>
    </section>
  );
}
