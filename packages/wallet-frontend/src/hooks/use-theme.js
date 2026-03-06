import { useEffect, useState } from 'react';
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    else {
        document.documentElement.classList.remove('dark');
    }
}
const STORAGE_KEY = 'param-theme';
export function useTheme() {
    const [theme, setThemeState] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ?? getSystemTheme();
    });
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);
    const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
    const setTheme = (t) => setThemeState(t);
    return { theme, toggleTheme, setTheme };
}
