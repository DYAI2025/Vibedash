import React, { useState } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { X, ListTodo, CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TasksPanel({ isOpen, onClose }: TasksPanelProps) {
  const { developmentOrders } = useProject();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  const filteredOrders = developmentOrders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const pendingCount = developmentOrders.filter(o => o.status === 'pending').length;
  const inProgressCount = developmentOrders.filter(o => o.status === 'in-progress').length;
  const completedCount = developmentOrders.filter(o => o.status === 'completed').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-md text-emerald-600 dark:text-emerald-400">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Project Tasks</h2>
                  <p className="text-xs text-zinc-500">Active Repository Orders</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex p-2 gap-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                All ({developmentOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'pending' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setActiveTab('in-progress')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'in-progress' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Active ({inProgressCount})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'completed' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Done ({completedCount})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400">
                    <ListTodo className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No tasks found</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-[250px]">
                      {activeTab === 'all' 
                        ? "Generate development orders from the Data Sources page to see them here."
                        : `You don't have any ${activeTab} tasks right now.`}
                    </p>
                  </div>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="group bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-emerald-200 dark:hover:border-emerald-900/50 cursor-pointer"
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {order.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : order.status === 'in-progress' ? (
                          <Clock className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                            {order.title}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                          {order.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            order.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] text-zinc-400 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            View details <ChevronRight className="h-3 w-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
