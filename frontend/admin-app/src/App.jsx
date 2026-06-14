import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
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

function PageLoader() {
  return <div style={{ padding: '2rem', color: 'var(--text-3)' }}>Dang tai...</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="bookings" element={<Suspense fallback={<PageLoader />}><Bookings /></Suspense>} />
            <Route path="readers" element={<Suspense fallback={<PageLoader />}><Readers /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />
            <Route path="reviews" element={<Suspense fallback={<PageLoader />}><Reviews /></Suspense>} />
            <Route path="payments" element={<Suspense fallback={<PageLoader />}><Payments /></Suspense>} />
            <Route path="content" element={<Suspense fallback={<PageLoader />}><Content /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
