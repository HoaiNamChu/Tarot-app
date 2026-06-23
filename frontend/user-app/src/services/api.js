function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  if (import.meta.env.DEV) return 'http://localhost:8000';

  throw new Error('Missing VITE_API_URL for production build.');
}

const BASE = resolveApiBase();
const PUBLIC_CACHE_TTL_MS = 2 * 60 * 1000;
const memoryCache = new Map();
const pendingRequests = new Map();

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

function readSessionCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.expiresAt || cached.expiresAt < Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }

    if (!Array.isArray(cached.data)) {
      sessionStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function writeSessionCache(key, data, ttlMs) {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      data,
      expiresAt: Date.now() + ttlMs,
    }));
  } catch {
    // Storage can be disabled or full; the network request already succeeded.
  }
}

function cachedPublicRequest(path, ttlMs = PUBLIC_CACHE_TTL_MS) {
  const key = `public:${path}`;
  const memoryHit = memoryCache.get(key);

  if (memoryHit?.expiresAt > Date.now()) {
    return Promise.resolve(memoryHit.data);
  }

  const sessionHit = readSessionCache(key);
  if (Array.isArray(sessionHit)) {
    memoryCache.set(key, { data: sessionHit, expiresAt: Date.now() + ttlMs });
    return Promise.resolve(sessionHit);
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = request(path)
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error('Invalid public API response.');
      }

      memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
      writeSessionCache(key, data, ttlMs);
      return data;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, promise);
  return promise;
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
    getAll: () => cachedPublicRequest('/readers'),
    getBusySlots: (readerId, month) => request(`/readers/${readerId}/busy-slots${month ? `?month=${month}` : ''}`),
    checkSlot: (readerId, bookedAt, serviceId) => request(`/readers/${readerId}/check-slot?booked_at=${encodeURIComponent(bookedAt)}&service_id=${serviceId}`),
  },
  services: {
    getAll: () => cachedPublicRequest('/services'),
  },
  settings: {
    payment: () => request('/settings/payment'),
  },
  policies: {
    get: (type) => request(`/policies/${encodeURIComponent(type)}`),
  },
  bookings: {
    getAll: () => request('/bookings'),
    create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id, data = {}) => request(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify(data) }),
    confirmCompletion: (id) => request(`/bookings/${id}/confirm-completion`, { method: 'PATCH' }),
    disputeCompletion: (id) => request(`/bookings/${id}/dispute-completion`, { method: 'PATCH' }),
    pay: (id, method, proof = {}) => request(`/bookings/${id}/pay`, { method: 'PATCH', body: JSON.stringify({ payment_method: method, ...proof }) }),
    getReviews: () => request('/bookings/reviews'),
    addReview: (id, data) => request(`/bookings/${id}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  },
  profile: {
    update: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
