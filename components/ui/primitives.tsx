import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  className,
  variant = 'secondary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('button', `button--${variant}`, `button--${size}`, className)}
      {...props}
    >
      {leadingIcon ? <span className="button__icon">{leadingIcon}</span> : null}
      {children ? <span>{children}</span> : null}
      {trailingIcon ? <span className="button__icon">{trailingIcon}</span> : null}
    </button>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({
  className,
  id,
  label,
  hint,
  error,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <label className="field" htmlFor={inputId}>
      {label ? <span className="field__label">{label}</span> : null}
      <input
        id={inputId}
        className={cx('input', Boolean(error) && 'input--error', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <span className="field__error" id={`${inputId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cx('card', interactive && 'card--interactive', className)}
      {...props}
    />
  );
}

type BadgeTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger';

export function StatusBadge({
  children,
  tone = 'neutral',
  pulse = false,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('status-badge', `status-badge--${tone}`, className)}>
      {pulse ? <span className="status-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('skeleton', className)} aria-hidden="true" {...props} />;
}
