const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('la_token');
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
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

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
  bookings: {
    getAll: () => request('/bookings'),
    create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH' }),
    pay: (id, method) => request(`/bookings/${id}/pay`, { method: 'PATCH', body: JSON.stringify({ payment_method: method }) }),
    getReviews: () => request('/bookings/reviews'),
    addReview: (id, data) => request(`/bookings/${id}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  },
  profile: {
    update: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
