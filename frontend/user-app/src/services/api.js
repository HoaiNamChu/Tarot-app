const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('la_token');
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
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
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (data) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  logout: (token) =>
    request('/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  me: () =>
    request('/auth/me'),

  readings: {
    getLimit: () => request('/readings/limit'),
    useLimit: () => request('/readings/use', { method: 'POST' }),
    interpret: (question, cards) => request('/readings/interpret', {
      method: 'POST',
      body: JSON.stringify({ question, cards }),
    }),
  },
  readers: {
    getAll: () => request('/readers'),
    getBusySlots: (readerId, month) => request(`/readers/${readerId}/busy-slots?month=${month}`),
    checkSlot: (readerId, bookedAt, serviceId) => request(`/readers/${readerId}/check-slot?booked_at=${encodeURIComponent(bookedAt)}&service_id=${serviceId}`),
  },
  services: {
    getAll: () => request('/services'),
  },
  settings: {
    payment: () => request('/settings/payment'),
  },
  bookings: {
    getAll: () => request('/bookings'),
    create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH' }),
    pay: (id, method, proof = {}) => request(`/bookings/${id}/pay`, { method: 'PATCH', body: JSON.stringify({ payment_method: method, ...proof }) }),
    getReviews: () => request('/bookings/reviews'),
    addReview: (id, data) => request(`/bookings/${id}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  },
  profile: {
    update: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
