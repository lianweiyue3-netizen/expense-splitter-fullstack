import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:opacity-90'
          : 'bg-transparent text-foreground hover:bg-secondary',
        className
      )}
      {...props}
    />
  );
}
