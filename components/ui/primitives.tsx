import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';

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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'secondary',
      size = 'md',
      leadingIcon,
      trailingIcon,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx('button', `button--${variant}`, `button--${size}`, className)}
        {...props}
      >
        {leadingIcon ? <span className="button__icon">{leadingIcon}</span> : null}
        {children ? <span>{children}</span> : null}
        {trailingIcon ? <span className="button__icon">{trailingIcon}</span> : null}
      </button>
    );
  },
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}

export function Input({
  className,
  id,
  label,
  hint,
  error,
  fieldClassName,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <label className={cx('field', fieldClassName)} htmlFor={inputId}>
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

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}

export function Select({
  className,
  id,
  label,
  hint,
  error,
  fieldClassName,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;
  const describedBy = error
    ? `${selectId}-error`
    : hint
      ? `${selectId}-hint`
      : undefined;

  return (
    <label className={cx('field', fieldClassName)} htmlFor={selectId}>
      {label ? <span className="field__label">{label}</span> : null}
      <select
        id={selectId}
        className={cx('input', 'select', Boolean(error) && 'input--error', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span className="field__error" id={`${selectId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${selectId}-hint`}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}

export function Textarea({
  className,
  id,
  label,
  hint,
  error,
  fieldClassName,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;
  const describedBy = error
    ? `${textareaId}-error`
    : hint
      ? `${textareaId}-hint`
      : undefined;

  return (
    <label className={cx('field', fieldClassName)} htmlFor={textareaId}>
      {label ? <span className="field__label">{label}</span> : null}
      <textarea
        id={textareaId}
        className={cx('input', 'textarea', Boolean(error) && 'input--error', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <span className="field__error" id={`${textareaId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${textareaId}-hint`}>
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
