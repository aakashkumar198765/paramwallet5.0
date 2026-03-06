import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'dd MMM yyyy, HH:mm');
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '...' : str;
}

export function formatTimestamp(ts: number): string {
  return format(new Date(ts), 'dd MMM yyyy, HH:mm:ss');
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
