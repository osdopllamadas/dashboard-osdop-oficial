import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('ultra_token') || null);
    const [authLoading, setAuthLoading] = useState(true); // true while validating token on load

    // On mount: validate any stored token with the server
    useEffect(() => {
        const token = localStorage.getItem('ultra_token');
        if (!token) {
            setAuthLoading(false);
            return;
        }
        // Validate token server-side on every page load/refresh
        fetch('/api/auth/validate', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.ok) return res.json();
                // Only clear session on explicit auth rejection (401/403), NOT on network errors
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('ultra_token');
                    setToken(null);
                    setUser(null);
                }
                return null;
            })
            .then(data => {
                if (data && data.username) {
                    setUser({ username: data.username, role: data.role });
                }
            })
            .catch(() => {
                // Network error (server temporarily down) — keep session alive
                // The user will be re-validated on next navigation or page reload
                console.warn('[Auth] Server unreachable during token validation — session preserved.');
            })
            .finally(() => setAuthLoading(false));
    }, []);

    const login = async (username, password) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                return false; // Invalid credentials
            }
            localStorage.setItem('ultra_token', data.token);
            setToken(data.token);
            setUser({ username: data.username, role: data.role });
            return true;
        } catch (err) {
            console.error('[Auth] Login request failed:', err);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('ultra_token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, authLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
