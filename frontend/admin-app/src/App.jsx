import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Analytics from './pages/Analytics/Analytics';
import Bookings from './pages/Bookings/Bookings';
import Readers from './pages/Readers/Readers';
import Users from './pages/Users/Users';
import Reviews from './pages/Reviews/Reviews';
import Payments from './pages/Payments/Payments';
import Content from './pages/Content/Content';
import Settings from './pages/Settings/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="readers" element={<Readers />} />
            <Route path="users" element={<Users />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="payments" element={<Payments />} />
            <Route path="content" element={<Content />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}