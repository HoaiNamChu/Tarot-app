import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth } from './contexts/AuthContext.jsx';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';

const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics/Analytics'));
const Bookings = lazy(() => import('./pages/Bookings/Bookings'));
const Readers = lazy(() => import('./pages/Readers/Readers'));
const Users = lazy(() => import('./pages/Users/Users'));
const Reviews = lazy(() => import('./pages/Reviews/Reviews'));
const Payments = lazy(() => import('./pages/Payments/Payments'));
const Content = lazy(() => import('./pages/Content/Content'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const ReaderPortal = lazy(() => import('./pages/ReaderPortal/ReaderPortal'));

function PageLoader() {
  return <div style={{ padding: '2rem', color: 'var(--text-3)' }}>Dang tai...</div>;
}

function RoleHome() {
  const { admin } = useAuth();
  return admin?.role === 'reader' ? <ReaderPortal /> : <Dashboard />;
}

function AdminOnly({ children }) {
  const { admin } = useAuth();
  if (admin?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Suspense fallback={<PageLoader />}><RoleHome /></Suspense>} />
            <Route path="reader" element={<Suspense fallback={<PageLoader />}><ReaderPortal /></Suspense>} />
            <Route path="reader/bookings" element={<Suspense fallback={<PageLoader />}><ReaderPortal /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AdminOnly><Analytics /></AdminOnly></Suspense>} />
            <Route path="bookings" element={<Suspense fallback={<PageLoader />}><AdminOnly><Bookings /></AdminOnly></Suspense>} />
            <Route path="readers" element={<Suspense fallback={<PageLoader />}><AdminOnly><Readers /></AdminOnly></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminOnly><Users /></AdminOnly></Suspense>} />
            <Route path="reviews" element={<Suspense fallback={<PageLoader />}><AdminOnly><Reviews /></AdminOnly></Suspense>} />
            <Route path="payments" element={<Suspense fallback={<PageLoader />}><AdminOnly><Payments /></AdminOnly></Suspense>} />
            <Route path="content" element={<Suspense fallback={<PageLoader />}><AdminOnly><Content /></AdminOnly></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><AdminOnly><Settings /></AdminOnly></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
