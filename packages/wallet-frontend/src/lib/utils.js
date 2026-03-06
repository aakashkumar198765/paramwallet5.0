import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatDate(timestamp) {
    return format(new Date(timestamp), 'dd MMM yyyy');
}
export function formatDateTime(timestamp) {
    return format(new Date(timestamp), 'dd MMM yyyy, HH:mm');
}
export function formatRelative(timestamp) {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}
export function truncate(str, length = 32) {
    return str.length > length ? `${str.slice(0, length)}…` : str;
}
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function generateId() {
    return Math.random().toString(36).slice(2, 11);
}
