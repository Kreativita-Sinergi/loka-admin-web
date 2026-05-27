import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BusinessesPage from './pages/BusinessesPage'
import BusinessDetailPage from './pages/BusinessDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import RegistrationRequestsPage from './pages/RegistrationRequestsPage'
import SecurityLogsPage from './pages/SecurityLogsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/businesses" element={<BusinessesPage />} />
          <Route path="/businesses/:id" element={<BusinessDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/registration-requests" element={<RegistrationRequestsPage />} />
          <Route path="/security-logs" element={<SecurityLogsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
