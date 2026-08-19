import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { formatTickets } from '../lib/format'

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-ink-700/70 bg-ink-900/70 p-5 shadow-lg shadow-black/30 backdrop-blur ${className}`}
    >
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle'
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:bg-ink-700 disabled:text-slate-500',
  ghost:
    'border border-ink-600 bg-transparent text-slate-200 hover:border-sky-500/70 hover:text-white disabled:opacity-40',
  danger:
    'border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-40',
  subtle: 'bg-ink-700 text-slate-200 hover:bg-ink-600 disabled:opacity-40',
}

export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-ink-600 bg-ink-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-500'

export function Tickets({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5 font-semibold',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full whitespace-nowrap bg-amber-400/10 font-medium text-amber-300 ring-1 ring-amber-400/25 ${sizes[size]}`}
    >
      🎟️ {formatTickets(value)}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </p>
  )
}
