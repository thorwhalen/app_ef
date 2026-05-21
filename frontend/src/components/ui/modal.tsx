/**
 * Modal — a minimal controlled overlay dialog.
 *
 * Deliberately dependency-free (no Radix): a fixed backdrop plus a centered
 * panel. Backdrop click and Escape both close it. Used by the command
 * palette and the create-corpus form.
 */
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl',
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
