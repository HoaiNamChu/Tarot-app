import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const { admin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/login');
    }
  }, [loading, admin, navigate]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Đang tải...</div>;

  if (!admin) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
      <div id='sbOverlay' className={`sb-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar admin={admin} onLogout={() => { logout(); navigate('/login'); }} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />
      <div className="main">
        <Topbar onHamburger={() => setSidebarOpen(o => !o)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}