import { Outlet, useParams } from 'react-router-dom';
import { LeftNav } from '@/components/layout/LeftNav';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { useAuthStore } from '@/store/auth.store';
import { useEffect } from 'react';
import { getUser } from '@/api/user.api';

export default function WorkspaceLayout() {
  const { subdomain, superAppId } = useParams<{ subdomain: string; superAppId?: string }>();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const { setActiveSuperApp, setActivePortal, clearSuperApp } = useSuperAppStore();
  const { userId } = useAuthStore();

  // Set active workspace in store whenever subdomain changes
  useEffect(() => {
    if (subdomain) setActiveWorkspace(subdomain);
  }, [subdomain, setActiveWorkspace]);

  // Set active SuperApp and portal when superAppId changes
  useEffect(() => {
    if (!superAppId) {
      clearSuperApp();
      return;
    }
    setActiveSuperApp(superAppId);

    // Fetch user's app_users doc to determine their portal/role in this SuperApp
    if (userId) {
      getUser(superAppId, userId)
        .then((user) => setActivePortal(user.role))
        .catch(() => {
          // User may not have an app_users doc yet; portal stays null
        });
    }
  }, [superAppId, userId, setActiveSuperApp, setActivePortal, clearSuperApp]);

  return (
    <>
      <LeftNav mode="workspace" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </>
  );
}
