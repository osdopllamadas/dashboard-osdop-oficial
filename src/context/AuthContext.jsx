import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
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
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.username) {
                    setUser({ username: data.username, role: data.role });
                } else {
                    // Token expired or invalid — clear session
                    localStorage.removeItem('ultra_token');
                    setUser(null);
                }
            })
            .catch(() => {
                // Network error: clear session to force re-login
                localStorage.removeItem('ultra_token');
                setUser(null);
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
            setUser({ username: data.username, role: data.role });
            return true;
        } catch (err) {
            console.error('[Auth] Login request failed:', err);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('ultra_token');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, authLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
