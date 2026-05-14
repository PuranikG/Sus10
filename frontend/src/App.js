import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';

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
import AdminBuildingDiscoveryPage from './pages/AdminBuildingDiscoveryPage';
import LeadFormPage from './pages/LeadFormPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import GreenRoofSurveyPage from './pages/GreenRoofSurveyPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CmsPage from './pages/CmsPage';
import CmsAdminPage from './pages/CmsAdminPage';
import CmsEditorPage from './pages/CmsEditorPage';

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
      <Route path="/search" element={<BuildingSearchPage />} />
      <Route path="/buildings/:buildingId" element={<BuildingReportPage />} />
      <Route path="/providers" element={<ProvidersPage />} />
      <Route path="/providers/:providerId" element={<ProviderDetailPage />} />
      <Route path="/initiatives" element={<InitiativesPage />} />
      <Route path="/initiatives/:initiativeId" element={<InitiativeDetailPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<CmsPage expectedType="blog" />} />

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
        <FeatureFlagProvider>
          <BrowserRouter>
            <div className="App min-h-screen bg-background">
              <AppRouter />
              <Toaster position="bottom-right" richColors />
            </div>
          </BrowserRouter>
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
