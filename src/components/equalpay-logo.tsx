import Link from 'next/link';
import { cn } from '@/lib/utils';

type EqualPayLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  href?: '/' | '/dashboard' | '/login' | '/signup';
  showText?: boolean;
  reloadDocument?: boolean;
};

export function EqualPayLogo({
  className,
  iconClassName,
  textClassName,
  href = '/',
  showText = true,
  reloadDocument = false
}: EqualPayLogoProps) {
  const content = (
    <>
      <svg
        aria-hidden="true"
        className={cn('h-8 w-8 text-current', iconClassName)}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="48" fill="currentColor" />
        <path
          d="M18 42H82"
          stroke="#0A0A0A"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M18 66H82"
          stroke="#0A0A0A"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <rect x="20" y="47" width="28" height="14" rx="7" fill="currentColor" />
        <rect x="52" y="47" width="28" height="14" rx="7" fill="currentColor" />
      </svg>
      {showText ? (
        <span
          className={cn('text-xl font-semibold tracking-wide', textClassName)}
        >
          EqualPay
        </span>
      ) : null}
    </>
  );

  if (reloadDocument) {
    return (
      <a
        className={cn('inline-flex items-center gap-2', className)}
        href={href}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      className={cn('inline-flex items-center gap-2', className)}
      href={href}
    >
      {content}
    </Link>
  );
}
