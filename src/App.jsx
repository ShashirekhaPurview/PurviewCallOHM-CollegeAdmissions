import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing      from './pages/landing/Landing'
import Login        from './pages/auth/Login'
import WorkflowPage  from './pages/WorkflowPage'
import CustomersPage  from './pages/CustomersPage'
import PricingPage    from './pages/PricingPage'
import BookDemoPage   from './pages/BookDemoPage'
import AppLayout   from './layouts/AppLayout'
import Placeholder from './pages/Placeholder'
import OrganizationsPage from './pages/superadmin/OrganizationsPage'
import UsersPage from './pages/superadmin/UsersPage'
import ContactsPage from './pages/contacts/ContactsPage'
import CallsPage from './pages/calls/CallsPage'
import ConversationsPage from './pages/analytics/AnalyticsPage'
import AnalyticsPage from './pages/analytics/AnalyticsOverviewPage'
import { getSession } from './api/auth/authService'
import OrganizationDetailsPage from './pages/superadmin/OrganizationDetailsPage'
import { RouteScrollRestoration } from './utils/homeNavigation'
import AgentPage from './pages/agents/AgentPage'

function AppRoutes() {
  const session = getSession()
  const role = session?.role

  if (!session?.accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout role={role}>
      <Routes>
        <Route
          path="organizations"
          element={role === 'super_admin' ? <OrganizationsPage /> : <Navigate to="/app/analytics" replace />}
        />
        <Route
          path="organizations/:orgId"
          element={role === 'super_admin' ? <OrganizationDetailsPage /> : <Navigate to="/app/analytics" replace />}
        />
        <Route
          path="users"
          element={role === 'org_admin' ? <UsersPage /> : <Navigate to="/app/analytics" replace />}
        />
        <Route path="contacts"   element={<ContactsPage />} />
        <Route path="agents"     element={<AgentPage />} />
        <Route path="calls"      element={<CallsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="analytics"  element={<AnalyticsPage />} />
        <Route path="*"          element={<Navigate to="analytics" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteScrollRestoration />
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/workflow"  element={<WorkflowPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/pricing"    element={<PricingPage />} />
        <Route path="/book-demo"  element={<BookDemoPage />} />
        <Route path="/app/*" element={<AppRoutes />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
