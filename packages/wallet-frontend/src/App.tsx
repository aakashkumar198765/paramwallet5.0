import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import Login from '@/pages/Login';
import PostLogin from '@/pages/PostLogin';
import AppShell from '@/layouts/AppShell';
import AuthLayout from '@/layouts/AuthLayout';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import DefinitionsLayout from '@/layouts/DefinitionsLayout';
import DefinitionsHub from '@/pages/definitions/DefinitionsHub';
import WorkspaceCreate from '@/pages/workspace/WorkspaceCreate';
import SuperAppList from '@/pages/workspace/SuperAppList';
import SuperAppInstall from '@/pages/workspace/SuperAppInstall';
import DocumentList from '@/pages/workspace/documents/DocumentList';
import DocumentDetail from '@/pages/workspace/documents/DocumentDetail';
import DocumentCreate from '@/pages/workspace/documents/DocumentCreate';
import DocumentChain from '@/pages/workspace/documents/DocumentChain';
import Settings from '@/pages/workspace/settings/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/post-login" replace /> : (
              <AuthLayout>
                <Login />
              </AuthLayout>
            )
          }
        />

        {/* Protected shell */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/post-login" element={<PostLogin />} />

          {/* Workspace create */}
          <Route path="/workspace/create" element={<WorkspaceCreate />} />

          {/* Workspace routes */}
          <Route path="/workspace/:subdomain" element={<WorkspaceLayout />}>
            <Route index element={<SuperAppList />} />
            <Route path="create-superapp" element={<SuperAppInstall />} />
            <Route path="settings/*" element={<Settings />} />
            <Route path=":superAppId/documents" element={<DocumentList />} />
            <Route path=":superAppId/documents/create" element={<DocumentCreate />} />
            <Route path=":superAppId/documents/:docId" element={<DocumentDetail />} />
            <Route path=":superAppId/documents/:docId/chain" element={<DocumentChain />} />
          </Route>

          {/* Definitions routes */}
          <Route path="/definitions/*" element={<DefinitionsLayout />}>
            <Route index element={<DefinitionsHub />} />
            <Route path="*" element={<DefinitionsHub />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/post-login" replace /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
