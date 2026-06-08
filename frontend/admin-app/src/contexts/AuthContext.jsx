/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('admin_token')));

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) return;
        api.auth.me()
            .then(user => {
                if (!['admin', 'reader'].includes(user.role)) throw new Error('Không có quyền');
                setAdmin(user);
            })
            .catch(() => localStorage.removeItem('admin_token'))
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const data = await api.auth.login(email, password);
        if (!['admin', 'reader'].includes(data.user.role)) {
            throw new Error('Tài khoản không có quyền truy cập.');
        }
        localStorage.setItem('admin_token', data.token);
        setAdmin(data.user);
    }

    function logout() {
        api.auth.logout().catch(() => { });
        localStorage.removeItem('admin_token');
        setAdmin(null);
    }

    return (
        <AuthContext.Provider value={{ admin, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}