import React from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Activity, Database, FileText, GitCommit, Github } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const { dataSources, logs } = useProject();

  const githubSource = dataSources.find(s => s.name.endsWith('-github.json'));
  let githubCommits: any[] = [];
  if (githubSource) {
    try {
      const parsed = JSON.parse(githubSource.rawContent);
      if (parsed.commits && Array.isArray(parsed.commits)) {
        githubCommits = parsed.commits.slice(0, 3);
      }
    } catch (e) {
      console.error("Failed to parse github source", e);
    }
  }

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

  // Generate some mock activity data for the chart based on logs or just mock data if empty
  const chartData = logs.length > 0 
    ? logs.slice(0, 10).reverse().map((log, i) => ({
        name: format(log.timestamp, 'HH:mm'),
        activity: i + 1
      }))
    : Array.from({ length: 7 }).map((_, i) => ({
        name: `${i}:00`,
        activity: Math.floor(Math.random() * 10)
      }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Project Dashboard</h2>
        <p className="text-zinc-500 mt-2">Overview of your project's data context and recent changes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>
              Pipeline activity and data updates over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="activity" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-3 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
              <CardDescription>
                Recent pipeline events and updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-zinc-500 border-2 border-dashed rounded-lg border-zinc-200 dark:border-zinc-800">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No recent activity.</p>
                  </div>
                ) : (
                  logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-4">
                      <div className="mt-0.5 p-1.5 bg-zinc-100 rounded-full dark:bg-zinc-800">
                        <Activity className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{log.action}</p>
                        <p className="text-sm text-zinc-500">{log.details}</p>
                        <p className="text-xs text-zinc-400">
                          {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {githubCommits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Recent Commits
                </CardTitle>
                <CardDescription>Latest updates from connected repository</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {githubCommits.map((commit: any, i: number) => (
                    <div key={i} className="flex flex-col gap-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium truncate" title={commit.message}>{commit.message}</span>
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 shrink-0">{commit.sha.substring(0, 7)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-600 dark:text-zinc-400">
                            {commit.author.charAt(0).toUpperCase()}
                          </div>
                          {commit.author}
                        </span>
                        <span>{formatDistanceToNow(new Date(commit.date), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
