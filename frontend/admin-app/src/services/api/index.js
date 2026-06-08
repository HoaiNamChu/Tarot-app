const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
    return localStorage.getItem('admin_token');
}

async function request(path, options = {}) {
    const res = await fetch(`${BASE}/api${path}`, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
            ...options.headers,
        },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.message || 'Lỗi server');
    return data;
}

export const api = {
    auth: {
        login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
        logout: () => request('/auth/logout', { method: 'POST' }),
        me: () => request('/auth/me'),
    },
    admin: {
        stats: () => request('/admin/stats'),
        bookings: {
            getAll: (params = '') => request(`/admin/bookings?${params}`),
            create: (data) => request('/admin/bookings', { method: 'POST', body: JSON.stringify(data) }),
            confirm: (id) => request(`/admin/bookings/${id}/confirm`, { method: 'PATCH' }),
            cancel: (id) => request(`/admin/bookings/${id}/cancel`, { method: 'PATCH' }),
            complete: (id) => request(`/admin/bookings/${id}/complete`, { method: 'PATCH' }),
            setZoom: (id, link) => request(`/admin/bookings/${id}/zoom`, { method: 'PATCH', body: JSON.stringify({ zoom_link: link }) }),
            updatePayment: (id, data) => request(`/admin/bookings/${id}/payment`, { method: 'PATCH', body: JSON.stringify(data) }),
        },
        readers: {
            getAll: () => request('/admin/readers'),
            create: (data) => request('/admin/readers', { method: 'POST', body: JSON.stringify(data) }),
            update: (id, d) => request(`/admin/readers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
            delete: (id) => request(`/admin/readers/${id}`, { method: 'DELETE' }),
        },
        services: {
            getAll: () => request('/admin/services'),
            create: (data) => request('/admin/services', { method: 'POST', body: JSON.stringify(data) }),
            update: (id, d) => request(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
            delete: (id) => request(`/admin/services/${id}`, { method: 'DELETE' }),
        },
        users: { getAll: () => request('/admin/users') },
        reviews: { getAll: () => request('/admin/reviews') },
        payments: { getAll: () => request('/admin/payments') },
    },
    reader: {
        me: () => request('/reader/me'),
        stats: () => request('/reader/stats'),
        bookings: (params = '') => request(`/reader/bookings?${params}`),
        updateProfile: (data) => request('/reader/profile', { method: 'PUT', body: JSON.stringify(data) }),
    },
};
