import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, BrainCircuit, Blocks, Settings, Terminal, X, Activity, Library } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');

  useEffect(() => {
    const savedOpenAI = localStorage.getItem('nexus_openai_key');
    const savedAnthropic = localStorage.getItem('nexus_anthropic_key');
    if (savedOpenAI) setOpenaiKeyInput(savedOpenAI);
    if (savedAnthropic) setAnthropicKeyInput(savedAnthropic);
  }, []);

  const saveApiKeys = () => {
    if (openaiKeyInput.trim()) {
      localStorage.setItem('nexus_openai_key', openaiKeyInput.trim());
    } else {
      localStorage.removeItem('nexus_openai_key');
    }

    if (anthropicKeyInput.trim()) {
      localStorage.setItem('nexus_anthropic_key', anthropicKeyInput.trim());
    } else {
      localStorage.removeItem('nexus_anthropic_key');
    }
    setIsSettingsOpen(false);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/templates', icon: Library, label: 'Templates' },
    { to: '/data', icon: Database, label: 'Data Sources' },
    { to: '/terminal', icon: Terminal, label: 'Terminal Editor' },
    { to: '/insights', icon: BrainCircuit, label: 'LLM Insights' },
    { to: '/integrations', icon: Blocks, label: 'Integrations' },
    { to: '/logs', icon: Activity, label: 'Activity Logs' },
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
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  API Configuration
                </h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-500">
                  Configure your API keys for third-party models. These keys are stored securely in your browser's local storage and are only sent to the backend when you make a request.
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">OPENAI_API_KEY</label>
                  <Input 
                    type="password" 
                    placeholder="sk-..." 
                    value={openaiKeyInput}
                    onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ANTHROPIC_API_KEY</label>
                  <Input 
                    type="password" 
                    placeholder="sk-ant-..." 
                    value={anthropicKeyInput}
                    onChange={(e) => setAnthropicKeyInput(e.target.value)}
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveApiKeys}>
                    Save Keys
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
