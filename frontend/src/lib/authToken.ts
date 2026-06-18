export function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload?.exp) return true;
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

export function clearStoredSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export function getValidStoredSession(): { token: string; user: string } | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) return null;
    if (isTokenExpired(token)) {
        clearStoredSession();
        return null;
    }

    return { token, user: storedUser };
}

export function isAuthApiPath(url?: string): boolean {
    if (!url) return false;
    return /\/auth\/(login|forgot-password|reset-password|magic-login|verify-creation)/.test(url);
}
