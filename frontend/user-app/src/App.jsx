import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home.jsx'
import Layout from './components/Layout.jsx'
import { ROUTES } from './constants/routes.js'
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard.jsx'
import PaymentResult from './pages/PaymentResult.jsx';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.PAYMENT_RESULT} element={<PaymentResult />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
