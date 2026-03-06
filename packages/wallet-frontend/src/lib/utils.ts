import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'dd MMM yyyy');
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), 'dd MMM yyyy, HH:mm');
}

export function formatRelative(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function truncate(str: string, length = 32): string {
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
