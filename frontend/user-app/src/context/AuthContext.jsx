import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import AuthModal from '../components/AuthModal/AuthModal.jsx';
import { api } from '../services/api.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const stored = localStorage.getItem('la_session');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('la_session');
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem('la_token');
  localStorage.removeItem('la_session');
}

export function AuthProvider({ children }) {
  const hasToken = Boolean(localStorage.getItem('la_token'));
  const [loading, setLoading] = useState(() => hasToken && !readStoredUser());
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('login');
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const showToast = useToast();

  const refreshBookings = useCallback(async function refreshBookings(options = {}) {
    if (!currentUser) return;

    if (!options.silent) setBookingsLoading(true);
    setBookingsError('');

    try {
      const [bookingsData, reviewsData] = await Promise.all([
        api.bookings.getAll(),
        api.bookings.getReviews(),
      ]);

      setBookings(bookingsData);
      setReviews(reviewsData);
    } catch {
      const message = 'Khong the dong bo lich dat. Vui long thu lai sau.';
      setBookingsError(message);
      if (!options.silent) showToast(message);
    } finally {
      if (!options.silent) setBookingsLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    const token = localStorage.getItem('la_token');
    if (!token) return;

    api.me()
      .then((user) => {
        if (localStorage.getItem('la_token') !== token) return;
        setCurrentUser(user);
        localStorage.setItem('la_session', JSON.stringify(user));
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          clearStoredSession();
          setCurrentUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setBookings([]);
      setReviews([]);
      setBookingsError('');
      setBookingsLoading(false);
      return;
    }

    refreshBookings();
  }, [currentUser, refreshBookings]);

  function openModal(tab = 'login') {
    setModalTab(tab);
    setModalOpen(true);
  }

  async function handleLogin(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem('la_token', data.token);
    localStorage.setItem('la_session', JSON.stringify(data.user));
    setCurrentUser(data.user);
  }

  async function handleRegister(name, email, password) {
    const data = await api.register(name, email, password);
    localStorage.setItem('la_token', data.token);
    localStorage.setItem('la_session', JSON.stringify(data.user));
    setCurrentUser(data.user);
  }

  async function handleLogout() {
    const token = localStorage.getItem('la_token');
    clearStoredSession();
    setCurrentUser(null);
    setBookings([]);
    setReviews([]);
    setBookingsError('');

    try {
      await api.logout(token);
    } catch {
      // Local logout already completed; remote token cleanup is best effort.
    }
  }

  async function cancelBooking(id, cancelReason = '') {
    try {
      const res = await api.bookings.cancel(id, cancelReason ? { cancel_reason: cancelReason } : {});
      setBookings(prev => prev.map(booking => (
        booking.booking_id === id ? { ...booking, status: 'cancelled', payment_status: res.payment_status || booking.payment_status, paid: (res.payment_status || booking.payment_status) === 'paid', cancel_reason: cancelReason || booking.cancel_reason, cancelled_by: 'customer' } : booking
      )));
      showToast('Da huy lich dat ' + id);
      await refreshBookings({ silent: true });
    } catch (error) {
      showToast(error.message || 'Huy lich that bai, vui long thu lai sau.');
    }
  }

  async function payBooking(id, method, proof = {}) {
    const res = await api.bookings.pay(id, method, proof);

    if (['vnpay', 'momo'].includes(method) && res.payment_url) {
      window.location.href = res.payment_url;
      return;
    }

    setBookings(prev => prev.map(booking => (
      booking.booking_id === id
        ? {
          ...booking,
          paid: res.payment_status === 'paid',
          payment_status: res.payment_status || booking.payment_status,
          payment_method: res.payment_method || method,
        }
        : booking
    )));

    await refreshBookings({ silent: true });
  }

  async function confirmBookingCompletion(id) {
    const res = await api.bookings.confirmCompletion(id);
    setBookings(prev => prev.map(booking => (
      booking.booking_id === id ? { ...booking, ...(res.booking || {}) } : booking
    )));
    showToast(res.message || 'Da xac nhan buoi xem hoan thanh.');
    await refreshBookings({ silent: true });
  }

  async function disputeBookingCompletion(id) {
    const res = await api.bookings.disputeCompletion(id);
    setBookings(prev => prev.map(booking => (
      booking.booking_id === id ? { ...booking, ...(res.booking || {}) } : booking
    )));
    showToast(res.message || 'Da bao admin kiem tra lai buoi xem.');
    await refreshBookings({ silent: true });
  }

  async function markReviewed(bookingId, reviewData) {
    const review = await api.bookings.addReview(bookingId, {
      stars: reviewData.stars,
      content: reviewData.text,
    });

    setBookings(prev => prev.map(booking => (
      booking.booking_id === bookingId ? { ...booking, reviewed: true } : booking
    )));
    setReviews(prev => [review, ...prev]);
  }

  function updateUser(user) {
    setCurrentUser(user);
    localStorage.setItem('la_session', JSON.stringify(user));
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoggedIn: !!currentUser,
      loading,
      refreshBookings,
      bookings,
      reviews,
      bookingsLoading,
      bookingsError,
      openModal,
      handleLogin,
      handleRegister,
      handleLogout,
      cancelBooking,
      payBooking,
      confirmBookingCompletion,
      disputeBookingCompletion,
      markReviewed,
      updateUser,
    }}>
      {children}
      <AuthModal
        isOpen={modalOpen}
        activeTab={modalTab}
        onClose={() => setModalOpen(false)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
