import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext.jsx';
import AuthModal from '../components/AuthModal/AuthModal.jsx';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('login');
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);

  // restore session khi reload
  useEffect(() => {
    const token = localStorage.getItem('la_token');
    if (!token){
      setLoading(false);
      return;
    } ;
    api.me()
      .then(user => setCurrentUser(user))
      .catch(() => localStorage.removeItem('la_token'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setBookings([]);
      setReviews([]);
      return;
    }
    // Fetch cả bookings và reviews song song
    Promise.all([
      api.bookings.getAll(),
      api.bookings.getReviews(),
    ]).then(([bookingsData, reviewsData]) => {
      setBookings(bookingsData);
      setReviews(reviewsData);
    }).catch(() => { /* ignore */ });
  }, [currentUser]);


  async function cancelBooking(id) {
    await api.bookings.cancel(id).then(() => {
      setBookings(prev => prev.map(b => b.booking_id === id ? { ...b, status: 'cancelled' } : b));
      showToast('Đã huỷ lịch đặt ' + id);
    }).then(() => {
      refreshBookings();
    }).catch(() => {
      showToast('Huỷ lịch thất bại, vui lòng thử lại sau');
    });
  }

  function openModal(tab = 'login') {
    setModalTab(tab);
    setModalOpen(true);
  }

  async function handleLogin(email, password) {
    const data = await api.login(email, password); // throw nếu lỗi
    localStorage.setItem('la_token', data.token);
    setCurrentUser(data.user);
  }

  async function handleRegister(name, email, password) {
    const data = await api.register(name, email, password);
    localStorage.setItem('la_token', data.token);
    setCurrentUser(data.user);
  }

  async function handleLogout() {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('la_token');
    setCurrentUser(null);
  }

  async function payBooking(id, method) {

    const res = await api.bookings.pay(
      id,
      method
    );

    if (
      method === 'vnpay' &&
      res.payment_url
    ) {
      window.location.href =
        res.payment_url;

      return;
    }

    setBookings(prev => prev.map(b =>
      b.booking_id === id
        ? {
          ...b,
          paid: res.payment_status === 'paid',
          payment_status: res.payment_status || b.payment_status,
          payment_method: res.payment_method || method
        }
        : b
    ));
  }

  // markReviewed gọi API thật
  async function markReviewed(bookingId, reviewData) {
    const review = await api.bookings.addReview(bookingId, {
      stars: reviewData.stars,
      content: reviewData.text,
    });
    setBookings(prev => prev.map(b =>
      b.booking_id === bookingId ? { ...b, reviewed: true } : b
    ));
    setReviews(prev => [review, ...prev]);
  }
  async function refreshBookings() {
    if (!currentUser) return;
    try {
      const [b, r] = await Promise.all([
        api.bookings.getAll(),
        api.bookings.getReviews(),
      ]);
      setBookings(b);
      setReviews(r);
    } catch { /* ignore */ }
  }

  function updateUser(user) {
    setCurrentUser(user);
    localStorage.setItem('la_session', JSON.stringify(user));
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoggedIn: !!currentUser,
      loading, refreshBookings,
      bookings, reviews,
      openModal, handleLogin, handleRegister, handleLogout,
      cancelBooking, payBooking, markReviewed,
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
