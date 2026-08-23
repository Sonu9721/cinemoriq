'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './primitives';

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = priorOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return panelRef;
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div className="overlay-layer" role="presentation">
      <button
        className="overlay-backdrop"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="overlay-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id="modal-title" className="overlay-title">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>
        <div className="overlay-body">{children}</div>
        {footer ? <div className="overlay-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div className="overlay-layer" role="presentation">
      <button
        className="overlay-backdrop"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="overlay-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id="drawer-title" className="overlay-title">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close drawer"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>
        <div className="overlay-body drawer__body">{children}</div>
      </div>
    </div>
  );
}
