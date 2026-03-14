import React, { useState, useEffect } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Activity, Database, GitCommit, Clock, Github, ListTodo } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatTerminal } from '@/src/components/dashboard/ChatTerminal';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export function Dashboard() {
  const { dataSources, logs, developmentOrders } = useProject();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(true);

  useEffect(() => {
    // Simulate fetching commits from a connected GitHub repository
    const fetchCommits = async () => {
      setIsLoadingCommits(true);
      try {
        // In a real app, this would be an API call to GitHub
        // For now, we'll simulate a delay and return mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCommits([
          {
            sha: 'a1b2c3d',
            message: 'Update AI chat component with Monaco editor',
            author: 'Developer',
            date: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
          },
          {
            sha: 'e4f5g6h',
            message: 'Fix syntax highlighting in Insights',
            author: 'Developer',
            date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
          },
          {
            sha: 'i7j8k9l',
            message: 'Initial commit',
            author: 'Developer',
            date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
          }
        ]);
      } catch (error) {
        console.error('Failed to fetch commits:', error);
      } finally {
        setIsLoadingCommits(false);
      }
    };

    fetchCommits();
  }, []);

  const stats = [
    {
      title: "Total Sources",
      value: dataSources.length,
      icon: Database,
      description: "Active data connections"
    },
    {
      title: "Total Versions",
      value: dataSources.reduce((acc, curr) => acc + curr.version, 0),
      icon: GitCommit,
      description: "Across all sources"
    },
    {
      title: "Recent Activities",
      value: logs.length,
      icon: Activity,
      description: "In the current session"
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-[1600px] mx-auto space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Project Dashboard</h2>
        <p className="text-zinc-500 mt-2">Overview of your project's data context and AI workspace.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dev Orders
            </CardTitle>
            <ListTodo className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{developmentOrders.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              Pending tasks
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatTerminal />
        </div>
        
        <div className="space-y-4">
          <Card className="h-[340px] flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Recent Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {logs.length > 0 ? (
                  [...logs].reverse().slice(0, 10).map((log, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="mt-0.5 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-md">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-zinc-500">{log.details}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500 italic text-center py-8">
                    No recent activity logs.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-[344px] flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Github className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                Latest Commits
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2">
              {isLoadingCommits ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-500"></div>
                </div>
              ) : commits.length > 0 ? (
                <div className="space-y-4">
                  {commits.map((commit, i) => (
                    <div key={i} className="flex gap-3 items-start border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-3 last:pb-0">
                      <div className="mt-0.5 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-md">
                        <GitCommit className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate" title={commit.message}>
                            {commit.message}
                          </p>
                          <span className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {commit.sha}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-500">{commit.author}</p>
                          <p className="text-[10px] text-zinc-400">
                            {formatDate(commit.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-zinc-500 italic text-center py-8">
                  No commits found. Connect a repository to see history.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {developmentOrders.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-emerald-500" />
              Development Orders
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {developmentOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-emerald-500 dark:border-l-emerald-600">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base leading-tight">{order.title}</CardTitle>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      order.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500 line-clamp-3" title={order.description}>
                    {order.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
