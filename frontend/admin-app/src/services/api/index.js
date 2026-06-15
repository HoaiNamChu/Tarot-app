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
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {};
    }
    if (!res.ok) {
        const message = res.status === 429
            ? 'Ban thao tac qua nhanh. Vui long doi mot chut roi thu lai.'
            : data.message || 'Loi server';
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
    }
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
        search: (q) => request(`/admin/search?q=${encodeURIComponent(q)}`),
        bookings: {
            getAll: (params = '') => request(`/admin/bookings?${params}`),
            create: (data) => request('/admin/bookings', { method: 'POST', body: JSON.stringify(data) }),
            confirm: (id) => request(`/admin/bookings/${id}/confirm`, { method: 'PATCH' }),
            cancel: (id) => request(`/admin/bookings/${id}/cancel`, { method: 'PATCH' }),
            complete: (id) => request(`/admin/bookings/${id}/complete`, { method: 'PATCH' }),
            updateStatus: (id, status) => request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
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
        users: {
            getAll: () => request('/admin/users'),
            create: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
            update: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
            delete: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
        },
        reviews: {
            getAll: () => request('/admin/reviews'),
            update: (id, data) => request(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
            reply: (id, data) => request(`/admin/reviews/${id}/reply`, { method: 'PATCH', body: JSON.stringify(data) }),
        },
        payments: { getAll: () => request('/admin/payments') },
        settings: {
            get: () => request('/admin/settings'),
            update: (data) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
        },
        notifications: {
            getAll: () => request('/admin/notifications'),
            markAllRead: () => request('/admin/notifications/read-all', { method: 'PATCH' }),
            markRead: (id) => request(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
        },
        actionLogs: { getAll: () => request('/admin/action-logs') },
    },
    reader: {
        me: () => request('/reader/me'),
        stats: () => request('/reader/stats'),
        services: () => request('/reader/services'),
        bookings: (params = '') => request(`/reader/bookings?${params}`),
        createBooking: (data) => request('/reader/bookings', { method: 'POST', body: JSON.stringify(data) }),
        updateBooking: (id, data) => request(`/reader/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        confirmBooking: (id) => request(`/reader/bookings/${id}/confirm`, { method: 'PATCH' }),
        completeBooking: (id) => request(`/reader/bookings/${id}/complete`, { method: 'PATCH' }),
        cancelBooking: (id) => request(`/reader/bookings/${id}/cancel`, { method: 'PATCH' }),
        updateProfile: (data) => request('/reader/profile', { method: 'PUT', body: JSON.stringify(data) }),
        notifications: {
            getAll: () => request('/reader/notifications'),
            markAllRead: () => request('/reader/notifications/read-all', { method: 'PATCH' }),
            markRead: (id) => request(`/reader/notifications/${id}/read`, { method: 'PATCH' }),
        },
    },
    profile: {
        changePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
    },
};
