import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home.jsx'
import FreeReading from './components/FreeReading/FreeReading.jsx'
import Services from './components/Services/Services.jsx'
import ReadersPage from './pages/ReadersPage.jsx'
import Booking from './components/Booking/Booking.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import Layout from './components/Layout.jsx'
import { ROUTES } from './constants/routes.js'
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const PaymentResult = lazy(() => import('./pages/PaymentResult.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const PolicyPage = lazy(() => import('./pages/PolicyPage.jsx'))

function PageLoader() {
  return <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Đang tải...</div>
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.FREE_READING} element={<FreeReading />} />
              <Route path={ROUTES.SERVICES} element={<Services />} />
              <Route path={ROUTES.READERS} element={<ReadersPage />} />
              <Route path={ROUTES.BOOKING} element={<Booking />} />
              <Route path={ROUTES.DASHBOARD} element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path={ROUTES.PAYMENT_RESULT} element={<Suspense fallback={<PageLoader />}><PaymentResult /></Suspense>} />
              <Route path={ROUTES.TERMS} element={<Suspense fallback={<PageLoader />}><PolicyPage type="terms" /></Suspense>} />
              <Route path={ROUTES.PRIVACY} element={<Suspense fallback={<PageLoader />}><PolicyPage type="privacy" /></Suspense>} />
              <Route path={ROUTES.PAYMENT_POLICY} element={<Suspense fallback={<PageLoader />}><PolicyPage type="payment" /></Suspense>} />
              <Route path={ROUTES.REFUND_POLICY} element={<Suspense fallback={<PageLoader />}><PolicyPage type="refund" /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
            </Routes>
          </Layout>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
