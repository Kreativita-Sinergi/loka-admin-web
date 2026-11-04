import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'

// Lazy-loaded pages — split into separate chunks for a smaller initial bundle.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const SalesPage = lazy(() => import('./pages/SalesPage'))
const UsagePage = lazy(() => import('./pages/UsagePage'))
const MerchantHealthPage = lazy(() => import('./pages/MerchantHealthPage'))
const BusinessesPage = lazy(() => import('./pages/BusinessesPage'))
const BusinessDetailPage = lazy(() => import('./pages/BusinessDetailPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const SecurityLogsPage = lazy(() => import('./pages/SecurityLogsPage'))
const ProspectsPage = lazy(() => import('./pages/ProspectsPage'))
const ThreadsBotPage = lazy(() => import('./pages/ThreadsBotPage'))
const MasterProductsPage = lazy(() => import('./pages/MasterProductsPage'))
const ResetTransactionsPage = lazy(() => import('./pages/ResetTransactionsPage'))
const SalesAgentsPage = lazy(() => import('./pages/SalesAgentsPage'))
const SalesAgentDetailPage = lazy(() => import('./pages/SalesAgentDetailPage'))
const SalesPayoutsPage = lazy(() => import('./pages/SalesPayoutsPage'))
const PaymentFeesPage = lazy(() => import('./pages/PaymentFeesPage'))
const SocialPage = lazy(() => import('./pages/SocialPage'))
const SocialPostPage = lazy(() => import('./pages/SocialPostPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route
            element={
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/merchant-health" element={<MerchantHealthPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/businesses/:id" element={<BusinessDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/security-logs" element={<SecurityLogsPage />} />
            <Route path="/prospects" element={<ProspectsPage />} />
            <Route path="/sales-agents" element={<SalesAgentsPage />} />
            <Route path="/sales-agents/:id" element={<SalesAgentDetailPage />} />
            <Route path="/sales-payouts" element={<SalesPayoutsPage />} />
            <Route path="/payment-fees" element={<PaymentFeesPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/social/new" element={<SocialPostPage />} />
            <Route path="/social/:id" element={<SocialPostPage />} />
            <Route path="/threads-bot" element={<ThreadsBotPage />} />
            <Route path="/master-products" element={<MasterProductsPage />} />
            <Route path="/reset-transactions" element={<ResetTransactionsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
