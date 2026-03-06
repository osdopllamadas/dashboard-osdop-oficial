import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('ultra_auth');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (username, password) => {
        // Client User
        if (username === 'OSDOP' && password === 'OSDOP2026@') {
            const newUser = { username, role: 'client' };
            setUser(newUser);
            localStorage.setItem('ultra_auth', JSON.stringify(newUser));
            return true;
        }
        // Admin User
        if (username === 'admin' && password === 'admin2026') {
            const newUser = { username, role: 'admin' };
            setUser(newUser);
            localStorage.setItem('ultra_auth', JSON.stringify(newUser));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('ultra_auth');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
