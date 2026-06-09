import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AddBookingModal from '../AddBookingModal/AddBookingModal';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const { admin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sidebarOpen) setSidebarOpen(false);
  }, [location.pathname, sidebarOpen]);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/login');
    }
  }, [loading, admin, navigate]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Đang tải...</div>;

  if (!admin) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
      <div className={`sb-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar admin={admin} onLogout={() => { logout(); navigate('/login'); }} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />
      <div className="main">
        <Topbar onHamburger={() => setSidebarOpen(o => !o)} onAddBooking={() => setModalOpen(true)} />
        <div className="content">
          <Outlet context={{ onAddBooking: () => setModalOpen(true) }} />
        </div>
      </div>
      <AddBookingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}