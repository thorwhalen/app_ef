/**
 * Small shared UI helpers.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names — `clsx` for conditional composition, then
 * `tailwind-merge` to resolve conflicting utilities (last one wins). The
 * standard shadcn/ui helper.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
