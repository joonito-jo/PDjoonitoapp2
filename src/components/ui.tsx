import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

function cn(...names: Array<string | false | undefined | null>) {
  return names.filter(Boolean).join(' ');
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'danger' }) {
  const base = 'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';
  const styles = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    outline: 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return <button className={cn(base, styles[variant], className)} {...props} />;
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-zinc-200 bg-white shadow-sm', className)} {...props} />;
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: 'zinc' | 'dark' | 'green' | 'red' | 'blue' | 'amber' | 'purple' }) {
  const styles = {
    zinc: 'bg-zinc-100 text-zinc-600',
    dark: 'bg-zinc-900 text-white',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold', styles[tone])}>{children}</span>;
}
