import { io, type Socket } from 'socket.io-client';

/** Vercel serverless API hosts cannot run Socket.io. */
function isServerlessSocketHost(url: string): boolean {
    return /\.vercel\.app$/i.test(new URL(url).hostname);
}

/** Resolve where the browser should open the Socket.io connection. */
export function resolveSocketURL(): string {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_SAME_ORIGIN === 'true') {
        return window.location.origin;
    }
    const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '');
    if (configured) return configured;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    try {
        const api = new URL(apiBase);
        api.pathname = '';
        api.search = '';
        api.hash = '';
        return api.origin;
    } catch {
        return 'http://localhost:5001';
    }
}

export function isSocketEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    if (process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'false') return false;
    if (process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true') return true;
    if (process.env.NEXT_PUBLIC_SOCKET_SAME_ORIGIN === 'true') return true;

    try {
        return !isServerlessSocketHost(resolveSocketURL());
    } catch {
        return false;
    }
}

let socketInstance: Socket | null = null;

function getSocketInstance(): Socket | null {
    if (!isSocketEnabled()) return null;
    if (!socketInstance) {
        socketInstance = io(resolveSocketURL(), {
            autoConnect: false,
            withCredentials: true,
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 3,
        });
    }
    return socketInstance;
}

/** Safe socket facade — no-ops when the target host cannot run Socket.io. */
const socket = {
    get connected() {
        return getSocketInstance()?.connected ?? false;
    },
    connect() {
        getSocketInstance()?.connect();
    },
    disconnect() {
        getSocketInstance()?.disconnect();
    },
    emit(event: string, ...args: unknown[]) {
        getSocketInstance()?.emit(event, ...args);
    },
    on(event: string, listener: (...args: unknown[]) => void) {
        getSocketInstance()?.on(event, listener);
    },
    off(event: string, listener?: (...args: unknown[]) => void) {
        const instance = getSocketInstance();
        if (!instance) return;
        if (listener) {
            instance.off(event, listener);
        } else {
            instance.off(event);
        }
    },
};

export default socket;
