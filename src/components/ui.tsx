import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

export function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(' ') }

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg' }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = 'primary', size = 'md', ...props }, ref) {
  return <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/70 disabled:cursor-not-allowed disabled:opacity-50', 'button', `button-${variant}`, `button-${size}`, className)} {...props} />
})

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, id, ...props }, ref) {
  const inputId = id ?? props.name
  const errorId = inputId ? `${inputId}-error` : undefined
  const hintId = inputId ? `${inputId}-hint` : undefined
  return <div className="field">
    {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
    <input ref={ref} className={cn('w-full rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/70', 'input', error && 'input-error', className)} id={inputId} aria-invalid={Boolean(error)} aria-describedby={[error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined} {...props} />
    {error && <span className="field-error" id={errorId}>{error}</span>}
    {hint && !error && <span className="field-hint" id={hintId}>{hint}</span>}
  </div>
})

export function Select({ label, id, children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  return <div className="field">{label && <label className="field-label" htmlFor={id}>{label}</label>}<select id={id} className={cn('input select', className)} {...props}>{children}</select></div>
}

export function Dialog({ trigger, title, description, children, contentClassName }: { trigger: ReactNode; title: string; description?: string; children: ReactNode; contentClassName?: string }) {
  return <DialogPrimitive.Root>
    <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={cn('dialog-content', contentClassName)}>
        <div className="dialog-heading"><div><DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description className="dialog-description">{description}</DialogPrimitive.Description>}</div><DialogPrimitive.Close className="icon-button dialog-close" aria-label="Fechar"><X size={18} /></DialogPrimitive.Close></div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} aria-hidden="true" /> }

