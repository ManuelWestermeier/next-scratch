import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/components/utils'

export const Panel = ({ className = '', children }: { className?: string; children: ReactNode }) => (
  <div className={cn('rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-soft backdrop-blur', className)}>{children}</div>
)

export const SectionTitle = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
    <h2 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h2>
    {action}
  </div>
)

export const Button = ({ className = '', variant = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'ghost' | 'danger' | 'primary' }) => (
  <button
    type={props.type ?? 'button'}
    {...props}
    className={cn(
      'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'default' && 'bg-slate-800 text-slate-100 hover:bg-slate-700',
      variant === 'ghost' && 'bg-transparent text-slate-200 hover:bg-slate-800',
      variant === 'danger' && 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25',
      variant === 'primary' && 'bg-sky-500 text-slate-950 hover:bg-sky-400',
      className,
    )}
  />
)

export const Input = ({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      'w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500',
      className,
    )}
  />
)

export const Select = ({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cn(
      'w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500',
      className,
    )}
  />
)

export const Label = ({ children }: { children: ReactNode }) => (
  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">{children}</div>
)

export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300">{children}</span>
)
