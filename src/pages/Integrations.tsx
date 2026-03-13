import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Cloud, Trello, Github, Figma, Link2, CheckCircle2, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '@/src/store/ProjectContext';

export function Integrations() {
  const { addDataSource, addLog } = useProject();
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubError, setGithubError] = useState('');
  
  // Mock states for other integrations
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnectGithub = async () => {
    if (!repoUrl) return;
    
    setIsConnecting(true);
    setGithubError('');
    try {
      // Parse owner and repo from URL or "owner/repo" format
      let owner = '';
      let repo = '';
      
      if (repoUrl.includes('github.com/')) {
        const parts = repoUrl.split('github.com/')[1].split('/');
        owner = parts[0];
        repo = parts[1].replace('.git', '');
      } else if (repoUrl.includes('/')) {
        const parts = repoUrl.split('/');
        owner = parts[0];
        repo = parts[1];
      } else {
        throw new Error('Invalid repository format. Use owner/repo or full URL.');
      }

      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      };
      
      // Fetch data from GitHub API
      const [commitsRes, issuesRes, pullsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=15`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=15`, { headers })
      ]);

      if (!commitsRes.ok) throw new Error('Failed to fetch repository data. Make sure it is public.');

      const commits = await commitsRes.json();
      const issues = await issuesRes.json();
      const pulls = await pullsRes.json();

      const githubData = {
        repository: `${owner}/${repo}`,
        fetchedAt: new Date().toISOString(),
        commits: Array.isArray(commits) ? commits.map((c: any) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date
        })) : [],
        issues: Array.isArray(issues) ? issues.filter((i: any) => !i.pull_request).map((i: any) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          user: i.user?.login,
          created_at: i.created_at
        })) : [],
        pullRequests: Array.isArray(pulls) ? pulls.map((p: any) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          user: p.user?.login,
          created_at: p.created_at
        })) : []
      };

      // Create a virtual file to add to data sources
      const blob = new Blob([JSON.stringify(githubData, null, 2)], { type: 'application/json' });
      const file = new File([blob], `${owner}-${repo}-github.json`, { type: 'application/json' });
      
      await addDataSource(file);
      addLog('Integration', `Connected GitHub repository ${owner}/${repo}`);
      
      setGithubConnected(true);
      setIsGithubModalOpen(false);
      setRepoUrl('');
    } catch (error: any) {
      console.error(error);
      setGithubError(error.message || 'Failed to connect to GitHub');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGenericConnect = (id: string) => {
    setConnectingId(id);
    // Simulate connection delay
    setTimeout(() => {
      setConnectingId(null);
      addLog('Integration', `Attempted to connect ${id} (Mock)`);
      alert(`Connection to ${id} is a premium feature not available in this demo.`);
    }, 1500);
  };

  const integrations = [
    {
      id: 'cloud-code',
      name: 'Google Cloud Code',
      description: 'Sync infrastructure state and deployment logs.',
      icon: Cloud,
      status: 'connected',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
      onClick: () => {}
    },
    {
      id: 'miro',
      name: 'Miro',
      description: 'Import architecture diagrams and brainstorming boards.',
      icon: Figma,
      status: 'available',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      onClick: () => handleGenericConnect('miro')
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Pull request context, issues, and commit history.',
      icon: Github,
      status: githubConnected ? 'connected' : 'available',
      color: 'text-zinc-900 dark:text-zinc-100',
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      onClick: () => setIsGithubModalOpen(true)
    },
    {
      id: 'jira',
      name: 'Jira / Trello',
      description: 'Project management tickets and sprint status.',
      icon: Trello,
      status: 'available',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
      onClick: () => handleGenericConnect('jira')
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-8 relative"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Integration Hub</h2>
        <p className="text-zinc-500 mt-2">Connect external tools to automatically sync project context into Nexus.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const isCurrentlyConnecting = connectingId === integration.id;
          
          return (
            <Card key={integration.id} className={`flex flex-col transition-all duration-200 ${integration.status === 'connected' ? 'border-green-200 dark:border-green-900/50 shadow-sm' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-xl ${integration.bg} relative`}>
                    <integration.icon className={`h-6 w-6 ${integration.color}`} />
                    {integration.status === 'connected' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-950"></div>
                    )}
                  </div>
                  {integration.status === 'connected' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full dark:bg-green-950/50 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full dark:bg-zinc-800 dark:text-zinc-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
                      Available
                    </span>
                  )}
                </div>
                <CardTitle className="text-xl">{integration.name}</CardTitle>
                <CardDescription className="pt-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-end">
                <Button 
                  variant={integration.status === 'connected' ? 'outline' : 'default'} 
                  className={`w-full gap-2 mt-4 ${integration.status === 'connected' ? 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-950/50' : ''}`}
                  onClick={integration.onClick}
                  disabled={isCurrentlyConnecting}
                >
                  {isCurrentlyConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : integration.status === 'connected' ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sync Now
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 border-dashed border-2 bg-zinc-50/50 dark:bg-zinc-900/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-white rounded-full shadow-sm mb-4 dark:bg-zinc-800">
            <Link2 className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">Custom API Webhook</h3>
          <p className="text-sm text-zinc-500 max-w-md mt-2">
            Push data directly to Nexus via our REST API. Perfect for custom CI/CD pipelines or internal tools.
          </p>
          <Button variant="outline" className="mt-6">
            Generate API Key
          </Button>
        </CardContent>
      </Card>

      {/* GitHub Connection Modal */}
      <AnimatePresence>
        {isGithubModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => !isConnecting && setIsGithubModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-zinc-950 rounded-xl shadow-2xl z-50 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      <Github className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">Connect GitHub</h3>
                  </div>
                  <button 
                    onClick={() => !isConnecting && setIsGithubModalOpen(false)}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
                    disabled={isConnecting}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Repository URL or owner/repo
                    </label>
                    <Input 
                      placeholder="e.g., facebook/react" 
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      disabled={isConnecting}
                      autoFocus
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Currently supports public repositories. This will fetch the latest commits, issues, and pull requests to add to your project context.
                    </p>
                  </div>

                  {githubError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-md flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>{githubError}</p>
                    </div>
                  )}
                  
                  <div className="pt-4 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsGithubModalOpen(false)} disabled={isConnecting}>
                      Cancel
                    </Button>
                    <Button onClick={handleConnectGithub} disabled={!repoUrl || isConnecting}>
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect Repository'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
