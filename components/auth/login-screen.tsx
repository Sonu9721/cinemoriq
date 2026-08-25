'use client';

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { safeAuthReturnPath } from '../../lib/auth-paths';
import { CinemoriqMark } from '../brand/cinemoriq-mark';
import { Button, StatusBadge } from '../ui/primitives';

type LoginScreenProps = {
  nextPath?: string;
};

const GENERIC_LOGIN_ERROR =
  'We could not sign you in. Check your email and password, then try again.';

function getLoginError(status: number) {
  if (status === 429) {
    return 'Too many sign-in attempts. Please wait a few minutes, then try again.';
  }
  if (status >= 500) {
    return 'Secure sign-in is temporarily unavailable. Please try again shortly.';
  }
  return GENERIC_LOGIN_ERROR;
}

export function LoginScreen({ nextPath = '/' }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        setError(getLoginError(response.status));
        return;
      }

      window.location.replace(safeAuthReturnPath(nextPath));
    } catch {
      setError('Unable to reach secure sign-in. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <a className="skip-link" href="#cinemoriq-login">
        Skip to secure sign in
      </a>

      <div className="auth-shell__atmosphere" aria-hidden="true">
        <span className="auth-shell__orb auth-shell__orb--blue" />
        <span className="auth-shell__orb auth-shell__orb--silver" />
        <span className="auth-shell__grid" />
      </div>

      <header className="auth-header" aria-label="Cinemoriq">
        <span className="auth-header__brand">
          <CinemoriqMark className="auth-header__mark" />
          <span className="auth-header__copy">
            <strong>Cinemoriq</strong>
            <span>Creative Intelligence OS</span>
          </span>
        </span>
        <StatusBadge tone="success" pulse>
          Protected workspace
        </StatusBadge>
      </header>

      <main className="auth-main" id="cinemoriq-login">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <p className="auth-story__eyebrow">
            <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
            Cinematic intelligence, operationalized
          </p>
          <h1 id="auth-story-title">
            Your creative operating system, <span>protected.</span>
          </h1>
          <p className="auth-story__body">
            Orchestrate AI campaigns, cinematic production, approvals, and
            performance from one private command center.
          </p>
          <div className="auth-story__trust" aria-label="Workspace security">
            <span>
              <ShieldCheck size={17} aria-hidden="true" />
              Private admin access
            </span>
            <span>
              <LockKeyhole size={17} aria-hidden="true" />
              Encrypted session
            </span>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="login-heading">
          <div className="auth-card__topline" aria-hidden="true" />
          <div className="auth-card__icon" aria-hidden="true">
            <LockKeyhole size={19} strokeWidth={1.8} />
          </div>
          <div className="auth-card__heading">
            <p className="eyebrow">Admin access</p>
            <h2 id="login-heading">Enter your workspace</h2>
            <p>Use your Cinemoriq administrator credentials to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="cinemoriq-email">
              <span className="field__label">Email address</span>
              <input
                className="input auth-form__input"
                id="cinemoriq-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError('');
                }}
                disabled={isSubmitting}
                required
                autoFocus
              />
            </label>

            <label className="field" htmlFor="cinemoriq-password">
              <span className="field__label">Password</span>
              <span className="auth-password-field">
                <input
                  className="input auth-form__input auth-form__input--password"
                  id="cinemoriq-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError('');
                  }}
                  disabled={isSubmitting}
                  required
                />
                <button
                  className="auth-password-field__toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            <div
              className="auth-form__error"
              role={error ? 'alert' : undefined}
              aria-live="polite"
            >
              {error ? (
                <>
                  <span aria-hidden="true" />
                  <p>{error}</p>
                </>
              ) : null}
            </div>

            <Button
              className="auth-form__submit"
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              trailingIcon={
                isSubmitting ? (
                  <LoaderCircle className="auth-form__spinner" size={17} />
                ) : (
                  <ArrowRight size={17} />
                )
              }
            >
              {isSubmitting ? 'Verifying securely' : 'Enter workspace'}
            </Button>
          </form>

          <p className="auth-card__footnote">
            <ShieldCheck size={14} aria-hidden="true" />
            Access is limited to authorized Cinemoriq administrators.
          </p>
        </section>
      </main>

      <footer className="auth-footer">
        <span>© 2026 Cinemoriq</span>
        <span>Secure creative operations</span>
      </footer>
    </div>
  );
}
