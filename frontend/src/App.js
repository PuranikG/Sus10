import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { PreviewRoleProvider } from './context/PreviewRoleContext';

// Pages
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import BuildingSearchPage from './pages/BuildingSearchPage';
import BuildingReportPage from './pages/BuildingReportPage';
import ProvidersPage from './pages/ProvidersPage';
import ProviderDetailPage from './pages/ProviderDetailPage';
import InitiativesPage from './pages/InitiativesPage';
import InitiativeDetailPage from './pages/InitiativeDetailPage';
import AdminPage from './pages/AdminPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminBuildingsPage from './pages/AdminBuildingsPage';
import AdminWaitlistPage from './pages/AdminWaitlistPage';
import AdminZohoSurveysPage from './pages/AdminZohoSurveysPage';
import AdminFeatureFlagsPage from './pages/AdminFeatureFlagsPage';
import AdminGenericListPage from './pages/AdminGenericListPage';
import AdminAuditLogPage from './pages/AdminAuditLogPage';
import AdminSubsidiesPage from './pages/AdminSubsidiesPage';
import AdminBuildingDiscoveryPage from './pages/AdminBuildingDiscoveryPage';
import BuildingPotentialPage from './pages/BuildingPotentialPage';
import SubsidiesPage from './pages/SubsidiesPage';
import SustenanceCalculatorPage from './pages/SustenanceCalculatorPage';
import CityInsightsPage from './pages/CityInsightsPage';
import VendorBrochurePage from './pages/VendorBrochurePage';
import LeadFormPage from './pages/LeadFormPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import GreenRoofSurveyPage from './pages/GreenRoofSurveyPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CmsPage from './pages/CmsPage';
import CmsAdminPage from './pages/CmsAdminPage';
import CmsEditorPage from './pages/CmsEditorPage';
import ResourcesIndexPage from './pages/ResourcesIndexPage';

import './App.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

// SignInRedirect — /signin triggers the OAuth flow immediately, no UI link needed
function SignInRedirect() {
  const { login, loading } = useAuth();
  useEffect(() => {
    if (!loading) login();
  }, [loading, login]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// App Router - handles session_id detection synchronously
function AppRouter() {
  const location = useLocation();

  // CRITICAL: Check for session_id synchronously during render (not in useEffect)
  // This prevents race conditions where ProtectedRoute runs before session is processed
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      {/* /signin — not linked in the UI; triggers OAuth flow for allowlist users */}
      <Route path="/signin" element={<SignInRedirect />} />
      <Route path="/initiatives" element={<InitiativesPage />} />
      <Route path="/initiatives/:initiativeId" element={<InitiativeDetailPage />} />
      <Route path="/resources" element={<ResourcesIndexPage />} />
      <Route path="/blog" element={<ResourcesIndexPage />} />
      <Route path="/blog/:slug" element={<CmsPage expectedType="blog" />} />

      {/* Allowlist-only Routes (authentication = allowlist via backend enforcement) */}
      <Route path="/search" element={<ProtectedRoute><BuildingSearchPage /></ProtectedRoute>} />
      <Route path="/buildings/:buildingId" element={<ProtectedRoute><BuildingReportPage /></ProtectedRoute>} />
      <Route path="/providers" element={<ProtectedRoute><ProvidersPage /></ProtectedRoute>} />
      <Route path="/providers/:providerId" element={<ProtectedRoute><ProviderDetailPage /></ProtectedRoute>} />
      <Route path="/subsidies" element={<ProtectedRoute><SubsidiesPage /></ProtectedRoute>} />
      <Route path="/calculate" element={<ProtectedRoute><SustenanceCalculatorPage /></ProtectedRoute>} />
      <Route path="/sustenance-calculator" element={<ProtectedRoute><SustenanceCalculatorPage /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><CityInsightsPage /></ProtectedRoute>} />
      <Route path="/insights/:city" element={<ProtectedRoute><CityInsightsPage /></ProtectedRoute>} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminOverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/legacy"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/discover"
        element={
          <ProtectedRoute>
            <AdminBuildingDiscoveryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/buildings"
        element={
          <ProtectedRoute>
            <AdminBuildingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/waitlist"
        element={
          <ProtectedRoute>
            <AdminWaitlistPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/zoho-surveys"
        element={
          <ProtectedRoute>
            <AdminZohoSurveysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/feature-flags"
        element={
          <ProtectedRoute>
            <AdminFeatureFlagsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/providers"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/projects"
        element={
          <ProtectedRoute>
            <AdminGenericListPage
              title="Projects"
              subtitle="All multi-building portfolios across users"
              endpoint="/projects"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'building_ids', label: 'Buildings', render: (r) => (r.building_ids || []).length },
                { key: 'created_at', label: 'Created', render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—' },
              ]}
              getId={(r) => r.group_id || r.project_id || r._id}
              linkTo={(r) => `/projects/${r.group_id || r.project_id}`}
              emptyHint="No projects yet."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/initiatives"
        element={
          <ProtectedRoute>
            <AdminGenericListPage
              title="Initiatives"
              subtitle="Community campaigns and pledges"
              endpoint="/initiatives"
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'city', label: 'City' },
                { key: 'initiative_type', label: 'Type' },
              ]}
              getId={(r) => r.initiative_id}
              linkTo={(r) => `/initiatives/${r.initiative_id}`}
              emptyHint="No initiatives yet."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leads"
        element={
          <ProtectedRoute>
            <AdminGenericListPage
              title="Leads"
              subtitle="Inbound lead form submissions"
              endpoint="/admin/leads"
              fallbackEndpoint="/leads"
              columns={[
                { key: 'user_name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'building_id', label: 'Building' },
                { key: 'lead_status', label: 'Status' },
              ]}
              getId={(r) => r.lead_id || r._id}
              emptyHint="No leads yet."
            />
          </ProtectedRoute>
        }
      />
      <Route path="/for-installers/brochure" element={<VendorBrochurePage />} />
      <Route
        path="/admin/subsidies"
        element={
          <ProtectedRoute>
            <AdminSubsidiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buildings/:buildingId/potential"
        element={<ProtectedRoute><BuildingPotentialPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute>
            <AdminAuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/intelligence"
        element={
          <ProtectedRoute>
            <AdminGenericListPage
              title="Intelligence Notes"
              subtitle="Curated caveats per building (wind, slab, heritage…)"
              endpoint="/admin/buildings?status=all&limit=2000"
              columns={[
                { key: 'address', label: 'Building' },
                { key: 'city', label: 'City' },
                { key: 'intel_notes', label: 'Notes', render: (r) => (r.intel_notes || []).length },
              ]}
              getId={(r) => r.building_id}
              linkTo={(r) => `/buildings/${r.building_id}`}
              emptyHint="No buildings with intelligence notes yet."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads/new"
        element={
          <ProtectedRoute>
            <LeadFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:groupId"
        element={
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Admin CMS */}
      <Route
        path="/admin/cms"
        element={
          <ProtectedRoute>
            <CmsAdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cms/new"
        element={
          <ProtectedRoute>
            <CmsEditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cms/:pageId/edit"
        element={
          <ProtectedRoute>
            <CmsEditorPage />
          </ProtectedRoute>
        }
      />

      {/* Public landing pages from CMS (must be LAST before catch-all) */}
      <Route path="/:slug" element={<CmsPage expectedType="landing" />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PreviewRoleProvider>
          <FeatureFlagProvider>
            <BrowserRouter>
              <div className="App min-h-screen bg-background">
                <AppRouter />
                <Toaster position="bottom-right" richColors />
              </div>
            </BrowserRouter>
          </FeatureFlagProvider>
        </PreviewRoleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
