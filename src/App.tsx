import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BusinessesPage from './pages/BusinessesPage'
import BusinessDetailPage from './pages/BusinessDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import SecurityLogsPage from './pages/SecurityLogsPage'
import LeadsPage from './pages/LeadsPage'
import WhatsAppSendersPage from './pages/WhatsAppSendersPage'

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
          <Route path="/security-logs" element={<SecurityLogsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/whatsapp-senders" element={<WhatsAppSendersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
