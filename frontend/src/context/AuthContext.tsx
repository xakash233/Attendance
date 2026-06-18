"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import socket from '@/lib/socket';
import { clearStoredSession, getValidStoredSession, isAuthApiPath } from '@/lib/authToken';

type User = {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'ACCOUNTANT' | 'EMPLOYEE';
    department?: { id: string, name: string };
    phone?: string;
    bio?: string;
    profileImage?: string;
    employeeCode?: string;
    shift?: string;
};

type AuthContextType = {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    login: (token: string, userData: User) => void;
    logout: () => void;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const isLoggingOut = useRef(false);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        socket.connect();
        // Redirection Logic: landing on main Dashboard
        router.push('/dashboard');
    };

    const logout = React.useCallback(() => {
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;
        clearStoredSession();
        setUser(null);
        socket.disconnect();
        router.push('/login');
        window.setTimeout(() => {
            isLoggingOut.current = false;
        }, 500);
    }, [router]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
    }, [user]);

    useEffect(() => {
        const session = getValidStoredSession();
        if (session) {
            setUser(JSON.parse(session.user));
            socket.connect();
        }
        setLoading(false);

        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                const requestUrl = error.config?.url as string | undefined;
                if (error.response?.status === 401 && !isAuthApiPath(requestUrl)) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
