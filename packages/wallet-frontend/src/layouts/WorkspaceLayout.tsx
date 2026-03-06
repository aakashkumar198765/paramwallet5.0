import { Outlet, useParams } from 'react-router-dom';
import { LeftNav } from '@/components/layout/LeftNav';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useEffect } from 'react';

export default function WorkspaceLayout() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  useEffect(() => {
    if (subdomain) setActiveWorkspace(subdomain);
  }, [subdomain, setActiveWorkspace]);

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
