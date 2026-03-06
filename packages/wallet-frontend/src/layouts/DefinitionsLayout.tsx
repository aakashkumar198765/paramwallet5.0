import { Outlet } from 'react-router-dom';
import { LeftNav } from '@/components/layout/LeftNav';

export default function DefinitionsLayout() {
  return (
    <>
      <LeftNav mode="definitions" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </>
  );
}
