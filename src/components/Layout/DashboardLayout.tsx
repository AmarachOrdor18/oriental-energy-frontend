import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
