import { Outlet } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Toaster } from '@/components/ui/toaster';

export default function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
