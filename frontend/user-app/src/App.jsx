import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home.jsx'
import Layout from './components/Layout.jsx'
import { ROUTES } from './constants/routes.js'
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const PaymentResult = lazy(() => import('./pages/PaymentResult.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))

function PageLoader() {
  return <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Dang tai...</div>
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.DASHBOARD} element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path={ROUTES.PAYMENT_RESULT} element={<Suspense fallback={<PageLoader />}><PaymentResult /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
            </Routes>
          </Layout>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
