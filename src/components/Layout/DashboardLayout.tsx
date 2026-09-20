import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handle = () => { setCollapsed(document.documentElement.classList.contains('sidebar-collapsed')); };
    handle();
    const observer = new MutationObserver(handle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${collapsed ? 'lg:ml-0 lg:pl-16' : 'lg:ml-64'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F9FAFB]/60 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
