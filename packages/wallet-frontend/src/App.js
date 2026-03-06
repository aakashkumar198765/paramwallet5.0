import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const WorkspaceOverview = lazy(() => import('@/pages/workspace/WorkspaceOverview').then((m) => ({ default: m.WorkspaceOverview })));
const DefinitionsHub = lazy(() => import('@/pages/definitions/DefinitionsHub').then((m) => ({ default: m.DefinitionsHub })));
const SuperAppList = lazy(() => import('@/pages/workspace/SuperAppList').then((m) => ({ default: m.SuperAppList })));
const OrgsPage = lazy(() => import('@/pages/workspace/OrgsPage').then((m) => ({ default: m.OrgsPage })));
const PlantsPage = lazy(() => import('@/pages/workspace/PlantsPage').then((m) => ({ default: m.PlantsPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const DocumentList = lazy(() => import('@/pages/documents/DocumentList').then((m) => ({ default: m.DocumentList })));
const DocumentDetail = lazy(() => import('@/pages/documents/DocumentDetail').then((m) => ({ default: m.DocumentDetail })));
const DocumentCreate = lazy(() => import('@/pages/documents/DocumentCreate').then((m) => ({ default: m.DocumentCreate })));
const UsersPage = lazy(() => import('@/pages/workspace/UsersPage').then((m) => ({ default: m.UsersPage })));
const RbacPage = lazy(() => import('@/pages/workspace/RbacPage').then((m) => ({ default: m.RbacPage })));
const DemoPage = lazy(() => import('@/pages/demo/DemoPage').then((m) => ({ default: m.DemoPage })));
const WorkspaceCreate = lazy(() => import('@/pages/workspace/WorkspaceCreate').then((m) => ({ default: m.WorkspaceCreate })));
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
    },
});
function SuspenseWrap({ children }) {
    return _jsx(Suspense, { fallback: _jsx(FullPageSpinner, {}), children: children });
}
export function App() {
    return (_jsxs(QueryClientProvider, { client: queryClient, children: [_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { element: _jsx(AuthLayout, {}), children: _jsx(Route, { path: "/login", element: _jsx(Login, {}) }) }), _jsx(Route, { path: "/post-login", element: _jsx(PostLogin, {}) }), _jsx(Route, { path: "/workspace/create", element: _jsx(SuspenseWrap, { children: _jsx(WorkspaceCreate, {}) }) }), _jsxs(Route, { element: _jsx(AppShell, {}), children: [_jsx(Route, { path: "/:workspaceId", element: _jsx(SuspenseWrap, { children: _jsx(WorkspaceOverview, {}) }) }), _jsx(Route, { path: "/:workspaceId/definitions", element: _jsx(SuspenseWrap, { children: _jsx(DefinitionsHub, {}) }) }), _jsx(Route, { path: "/:workspaceId/superapps", element: _jsx(SuspenseWrap, { children: _jsx(SuperAppList, {}) }) }), _jsx(Route, { path: "/:workspaceId/orgs", element: _jsx(SuspenseWrap, { children: _jsx(OrgsPage, {}) }) }), _jsx(Route, { path: "/:workspaceId/plants", element: _jsx(SuspenseWrap, { children: _jsx(PlantsPage, {}) }) }), _jsx(Route, { path: "/:workspaceId/settings", element: _jsx(SuspenseWrap, { children: _jsx(SettingsPage, {}) }) }), _jsx(Route, { path: "/:workspaceId/sa/:superAppId/documents", element: _jsx(SuspenseWrap, { children: _jsx(DocumentList, {}) }) }), _jsx(Route, { path: "/:workspaceId/sa/:superAppId/documents/new", element: _jsx(SuspenseWrap, { children: _jsx(DocumentCreate, {}) }) }), _jsx(Route, { path: "/:workspaceId/sa/:superAppId/documents/:docId", element: _jsx(SuspenseWrap, { children: _jsx(DocumentDetail, {}) }) }), _jsx(Route, { path: "/:workspaceId/sa/:superAppId/users", element: _jsx(SuspenseWrap, { children: _jsx(UsersPage, {}) }) }), _jsx(Route, { path: "/:workspaceId/sa/:superAppId/rbac", element: _jsx(SuspenseWrap, { children: _jsx(RbacPage, {}) }) }), _jsx(Route, { path: "/:workspaceId/sa/:superAppId/demo", element: _jsx(SuspenseWrap, { children: _jsx(DemoPage, {}) }) })] }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }) }), _jsx(Toaster, {})] }));
}
