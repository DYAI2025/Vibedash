import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, BrainCircuit, Blocks, Settings, Terminal } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function Layout() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/data', icon: Database, label: 'Data Sources' },
    { to: '/terminal', icon: Terminal, label: 'Terminal Editor' },
    { to: '/insights', icon: BrainCircuit, label: 'LLM Insights' },
    { to: '/integrations', icon: Blocks, label: 'Integrations' },
  ];

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
              <span className="text-zinc-50 dark:text-zinc-900 text-xs font-bold">N</span>
            </div>
            Nexus
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Project Context System</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50" 
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
