import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Cloud, Trello, Github, Figma, Link2, CheckCircle2, X, Loader2, RefreshCw, AlertCircle, Search, GitCommit, GitPullRequest, CircleDot, XCircle, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '@/src/store/ProjectContext';

export function Integrations() {
  const { dataSources, addDataSource, removeDataSource, addLog } = useProject();
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  
  // Mock states for other integrations
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  // Find GitHub data in data sources
  const githubDataSource = useMemo(() => {
    return dataSources.find(ds => ds.name.endsWith('-github.json'));
  }, [dataSources]);

  const githubData = useMemo(() => {
    if (!githubDataSource) return null;
    try {
      return JSON.parse(githubDataSource.normalized.textContent);
    } catch (e) {
      return null;
    }
  }, [githubDataSource]);

  useEffect(() => {
    const token = localStorage.getItem('nexus_github_token');
    if (token) {
      setGithubToken(token);
      setGithubConnected(true);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        const token = event.data.token;
        localStorage.setItem('nexus_github_token', token);
        setGithubToken(token);
        setGithubConnected(true);
        setGithubError('');
        fetchUserRepos(token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchUserRepos = async (token: string) => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=20', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch repositories');
      const data = await res.json();
      setUserRepos(data);
    } catch (err: any) {
      console.error(err);
      setGithubError(err.message || 'Failed to fetch repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleOpenGithubModal = () => {
    setIsGithubModalOpen(true);
    if (githubToken && userRepos.length === 0) {
      fetchUserRepos(githubToken);
    }
  };

  const startGithubOAuth = async () => {
    try {
      setGithubError('');
      const response = await fetch('/api/auth/github/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL. Check if GITHUB_CLIENT_ID is configured.');
      }
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setGithubError('Please allow popups for this site to connect your account.');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      setGithubError(error.message);
    }
  };

  const handleConnectGithub = async (selectedRepoUrl?: string) => {
    const targetUrl = selectedRepoUrl || repoUrl;
    if (!targetUrl) return;
    
    setIsConnecting(true);
    setGithubError('');
    try {
      let owner = '';
      let repo = '';
      
      if (targetUrl.includes('github.com/')) {
        const parts = targetUrl.split('github.com/')[1].split('/');
        owner = parts[0];
        repo = parts[1].replace('.git', '');
      } else if (targetUrl.includes('/')) {
        const parts = targetUrl.split('/');
        owner = parts[0];
        repo = parts[1];
      } else {
        throw new Error('Invalid repository format. Use owner/repo or full URL.');
      }

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
      };
      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }
      
      const [commitsRes, issuesRes, pullsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=15`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=15`, { headers })
      ]);

      if (!commitsRes.ok) throw new Error('Failed to fetch repository data. Make sure it is public or you are authenticated.');

      const commits = await commitsRes.json();
      const issues = await issuesRes.json();
      const pulls = await pullsRes.json();

      const githubDataObj = {
        repository: `${owner}/${repo}`,
        fetchedAt: new Date().toISOString(),
        commits: Array.isArray(commits) ? commits.map((c: any) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author?.name || c.commit.author?.login || 'Unknown',
          date: c.commit.author?.date
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

      const blob = new Blob([JSON.stringify(githubDataObj, null, 2)], { type: 'application/json' });
      const file = new File([blob], `${owner}-${repo}-github.json`, { type: 'application/json' });
      
      await addDataSource(file);
      addLog('Integration', `Connected GitHub repository ${owner}/${repo}`);
      
      setIsGithubModalOpen(false);
      setRepoUrl('');
    } catch (error: any) {
      console.error(error);
      setGithubError(error.message || 'Failed to connect to GitHub');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGithub = () => {
    if (githubDataSource) {
      removeDataSource(githubDataSource.id);
      addLog('Integration', `Disconnected GitHub repository ${githubData?.repository}`);
    }
  };

  const handleGenericConnect = (id: string) => {
    setConnectingId(id);
    setErrorId(null);
    setTimeout(() => {
      setConnectingId(null);
      setErrorId(id);
      addLog('Integration Error', `Failed to connect ${id} (Premium feature required)`);
      setTimeout(() => setErrorId(null), 3000);
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
      onClick: () => {},
      onDisconnect: () => {}
    },
    {
      id: 'miro',
      name: 'Miro',
      description: 'Import architecture diagrams and brainstorming boards.',
      icon: Figma,
      status: 'available',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      onClick: () => handleGenericConnect('miro'),
      onDisconnect: () => {}
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Pull request context, issues, and commit history.',
      icon: Github,
      status: githubDataSource ? 'connected' : (githubConnected ? 'available' : 'available'),
      color: 'text-zinc-900 dark:text-zinc-100',
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      onClick: handleOpenGithubModal,
      onDisconnect: handleDisconnectGithub
    },
    {
      id: 'jira',
      name: 'Jira / Trello',
      description: 'Project management tickets and sprint status.',
      icon: Trello,
      status: 'available',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
      onClick: () => handleGenericConnect('jira'),
      onDisconnect: () => {}
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
          const hasError = errorId === integration.id;
          
          return (
            <Card key={integration.id} className={`flex flex-col transition-all duration-200 ${integration.status === 'connected' ? 'border-green-200 dark:border-green-900/50 shadow-sm' : hasError ? 'border-red-200 dark:border-red-900/50 shadow-sm' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-xl ${integration.bg} relative`}>
                    <integration.icon className={`h-6 w-6 ${integration.color}`} />
                    {integration.status === 'connected' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-950"></div>
                    )}
                    {isCurrentlyConnecting && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse"></div>
                    )}
                    {hasError && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></div>
                    )}
                  </div>
                  {isCurrentlyConnecting ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full dark:bg-blue-950/50 dark:text-blue-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Connecting...
                    </span>
                  ) : hasError ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full dark:bg-red-950/50 dark:text-red-400">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </span>
                  ) : integration.status === 'connected' ? (
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
              <CardContent className="flex-1 flex items-end gap-2">
                <Button 
                  variant={integration.status === 'connected' ? 'outline' : hasError ? 'destructive' : 'default'} 
                  className={`flex-1 gap-2 mt-4 ${integration.status === 'connected' ? 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-950/50' : ''}`}
                  onClick={integration.onClick}
                  disabled={isCurrentlyConnecting}
                >
                  {isCurrentlyConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : hasError ? (
                    <>
                      <Unlink className="h-4 w-4" />
                      Retry Connection
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
                {integration.status === 'connected' && integration.id !== 'cloud-code' && (
                  <Button 
                    variant="outline" 
                    className="mt-4 px-3 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50"
                    onClick={integration.onDisconnect}
                    title="Disconnect"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {githubData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
                  <Github className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{githubData.repository}</h3>
                  <p className="text-sm text-zinc-500">Last synced: {new Date(githubData.fetchedAt).toLocaleString()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleConnectGithub(githubData.repository)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
              <div className="p-6">
                <h4 className="flex items-center gap-2 font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                  <GitCommit className="h-4 w-4 text-blue-500" />
                  Recent Commits
                </h4>
                <div className="space-y-4">
                  {githubData.commits.slice(0, 5).map((commit: any) => (
                    <div key={commit.sha} className="text-sm">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{commit.message.split('\n')[0]}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                        <span>{commit.author}</span>
                        <span>{new Date(commit.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {githubData.commits.length === 0 && <p className="text-sm text-zinc-500">No recent commits.</p>}
                </div>
              </div>
              
              <div className="p-6">
                <h4 className="flex items-center gap-2 font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                  <CircleDot className="h-4 w-4 text-green-500" />
                  Active Issues
                </h4>
                <div className="space-y-4">
                  {githubData.issues.slice(0, 5).map((issue: any) => (
                    <div key={issue.number} className="text-sm">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">#{issue.number} {issue.title}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                        <span className={`px-1.5 py-0.5 rounded-sm ${issue.state === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                          {issue.state}
                        </span>
                        <span>{issue.user}</span>
                      </div>
                    </div>
                  ))}
                  {githubData.issues.length === 0 && <p className="text-sm text-zinc-500">No active issues.</p>}
                </div>
              </div>
              
              <div className="p-6">
                <h4 className="flex items-center gap-2 font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                  <GitPullRequest className="h-4 w-4 text-purple-500" />
                  Pull Requests
                </h4>
                <div className="space-y-4">
                  {githubData.pullRequests.slice(0, 5).map((pr: any) => (
                    <div key={pr.number} className="text-sm">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">#{pr.number} {pr.title}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                        <span className={`px-1.5 py-0.5 rounded-sm ${pr.state === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                          {pr.state}
                        </span>
                        <span>{pr.user}</span>
                      </div>
                    </div>
                  ))}
                  {githubData.pullRequests.length === 0 && <p className="text-sm text-zinc-500">No pull requests.</p>}
                </div>
              </div>
            </div>

            {/* Detailed Commits Section */}
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
              <h4 className="flex items-center gap-2 font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                <GitCommit className="h-4 w-4 text-blue-500" />
                Latest 5 Commits Details
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-lg">SHA</th>
                      <th className="px-4 py-3 font-medium">Message</th>
                      <th className="px-4 py-3 font-medium">Author</th>
                      <th className="px-4 py-3 font-medium rounded-tr-lg">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {githubData.commits.slice(0, 5).map((commit: any) => (
                      <tr key={commit.sha} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{commit.sha.substring(0, 7)}</td>
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 truncate max-w-xs" title={commit.message}>{commit.message.split('\n')[0]}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{commit.author}</td>
                        <td className="px-4 py-3 text-zinc-500">{new Date(commit.date).toLocaleString()}</td>
                      </tr>
                    ))}
                    {githubData.commits.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No recent commits found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

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
                  {!githubToken ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                      <p className="text-sm text-zinc-500">
                        Connect your GitHub account to access your private repositories, issues, and pull requests.
                      </p>
                      <Button onClick={startGithubOAuth} className="w-full">
                        <Github className="mr-2 h-4 w-4" />
                        Authenticate with GitHub
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Select a Repository
                        </label>
                        {isLoadingRepos ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                          </div>
                        ) : userRepos.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md mb-4">
                            {userRepos.map(repo => (
                              <button
                                key={repo.id}
                                onClick={() => handleConnectGithub(repo.full_name)}
                                disabled={isConnecting}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex justify-between items-center"
                              >
                                <span className="font-medium truncate">{repo.full_name}</span>
                                {repo.private && <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">Private</span>}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        
                        <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                          <span className="flex-shrink-0 mx-4 text-zinc-400 text-xs">OR ENTER MANUALLY</span>
                          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                        </div>

                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 mt-2">
                          Repository URL or owner/repo
                        </label>
                        <Input 
                          placeholder="e.g., facebook/react" 
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          disabled={isConnecting}
                        />
                        <p className="text-xs text-zinc-500 mt-2">
                          This will fetch the latest commits, issues, and pull requests to add to your project context.
                        </p>
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsGithubModalOpen(false)} disabled={isConnecting}>
                          Cancel
                        </Button>
                        <Button onClick={() => handleConnectGithub()} disabled={!repoUrl || isConnecting}>
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
                    </>
                  )}

                  {githubError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-md flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>{githubError}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

