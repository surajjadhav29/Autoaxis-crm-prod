import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
  children?: ReactNode;
}

export function AnimatedButton({
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  icon: Icon,
  className = '',
  ...props
}: AnimatedButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'crm-btn crm-btn--primary',
    secondary: 'crm-btn crm-btn--secondary',
    ghost: 'crm-btn crm-btn--secondary',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Saving…</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={16} />}
          {children}
        </>
      )}
    </button>
  );
}
