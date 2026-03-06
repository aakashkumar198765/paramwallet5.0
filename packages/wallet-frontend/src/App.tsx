import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';

// Eagerly load auth pages
import { Login } from '@/pages/Login';
import { PostLogin } from '@/pages/PostLogin';

// Lazy-load all app pages
const WorkspaceOverview = lazy(() =>
  import('@/pages/workspace/WorkspaceOverview').then((m) => ({ default: m.WorkspaceOverview })),
);
const DefinitionsHub = lazy(() =>
  import('@/pages/definitions/DefinitionsHub').then((m) => ({ default: m.DefinitionsHub })),
);
const SuperAppList = lazy(() =>
  import('@/pages/workspace/SuperAppList').then((m) => ({ default: m.SuperAppList })),
);
const OrgsPage = lazy(() =>
  import('@/pages/workspace/OrgsPage').then((m) => ({ default: m.OrgsPage })),
);
const PlantsPage = lazy(() =>
  import('@/pages/workspace/PlantsPage').then((m) => ({ default: m.PlantsPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const DocumentList = lazy(() =>
  import('@/pages/documents/DocumentList').then((m) => ({ default: m.DocumentList })),
);
const DocumentDetail = lazy(() =>
  import('@/pages/documents/DocumentDetail').then((m) => ({ default: m.DocumentDetail })),
);
const DocumentCreate = lazy(() =>
  import('@/pages/documents/DocumentCreate').then((m) => ({ default: m.DocumentCreate })),
);
const UsersPage = lazy(() =>
  import('@/pages/workspace/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const RbacPage = lazy(() =>
  import('@/pages/workspace/RbacPage').then((m) => ({ default: m.RbacPage })),
);
const DemoPage = lazy(() =>
  import('@/pages/demo/DemoPage').then((m) => ({ default: m.DemoPage })),
);
const WorkspaceCreate = lazy(() =>
  import('@/pages/workspace/WorkspaceCreate').then((m) => ({ default: m.WorkspaceCreate })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Post-login workspace picker (no shell) */}
          <Route path="/post-login" element={<PostLogin />} />
          <Route
            path="/workspace/create"
            element={
              <SuspenseWrap>
                <WorkspaceCreate />
              </SuspenseWrap>
            }
          />

          {/* Main app shell */}
          <Route element={<AppShell />}>
            <Route
              path="/:workspaceId"
              element={
                <SuspenseWrap>
                  <WorkspaceOverview />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/definitions"
              element={
                <SuspenseWrap>
                  <DefinitionsHub />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/superapps"
              element={
                <SuspenseWrap>
                  <SuperAppList />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/orgs"
              element={
                <SuspenseWrap>
                  <OrgsPage />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/plants"
              element={
                <SuspenseWrap>
                  <PlantsPage />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/settings"
              element={
                <SuspenseWrap>
                  <SettingsPage />
                </SuspenseWrap>
              }
            />
            {/* SuperApp scoped routes */}
            <Route
              path="/:workspaceId/sa/:superAppId/documents"
              element={
                <SuspenseWrap>
                  <DocumentList />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/sa/:superAppId/documents/new"
              element={
                <SuspenseWrap>
                  <DocumentCreate />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/sa/:superAppId/documents/:docId"
              element={
                <SuspenseWrap>
                  <DocumentDetail />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/sa/:superAppId/users"
              element={
                <SuspenseWrap>
                  <UsersPage />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/sa/:superAppId/rbac"
              element={
                <SuspenseWrap>
                  <RbacPage />
                </SuspenseWrap>
              }
            />
            <Route
              path="/:workspaceId/sa/:superAppId/demo"
              element={
                <SuspenseWrap>
                  <DemoPage />
                </SuspenseWrap>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
