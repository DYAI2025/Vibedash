import React, { useState } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Search, Activity, Clock, FileText, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function Logs() {
  const { logs } = useProject();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLogIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('error') || lowerAction.includes('fail')) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (lowerAction.includes('add') || lowerAction.includes('import')) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (lowerAction.includes('remove') || lowerAction.includes('delete')) return <Trash2 className="h-4 w-4 text-orange-500" />;
    if (lowerAction.includes('update')) return <Activity className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-zinc-500" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-5xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-zinc-500 mt-2">View a chronological history of all actions and events in your workspace.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search logs..." 
            className="pl-9 bg-white dark:bg-zinc-950"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-zinc-500" />
            System Events
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'} recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="mt-1 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-100 dark:border-zinc-700">
                    {getLogIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {log.action}
                      </h4>
                      <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 break-words">
                      {log.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center text-zinc-500">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No logs found</p>
              <p className="text-sm">
                {searchQuery ? `No events match your search "${searchQuery}"` : "There are no activity logs recorded yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
