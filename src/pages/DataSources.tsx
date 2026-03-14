import React, { useRef, useState, useEffect } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { UploadCloud, FileJson, FileText, Table, Trash2, RefreshCw, Database, Layers, Copy, Check, Link, Loader2, X, Target, FileBadge, ListTodo } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateDevelopmentOrders, AIProvider } from '@/src/lib/ai';

export function DataSources() {
  const { dataSources, addDataSource, removeDataSource, pgdContent, setPgdContent, specContent, setSpecContent, developmentOrders, setDevelopmentOrders, activeModels, addLog } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pgdInputRef = useRef<HTMLInputElement>(null);
  const specInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{id: string, name: string, progress: number, status: 'pending' | 'processing' | 'success' | 'error'}[]>([]);

  const [dbType, setDbType] = useState<string>('postgres');
  const [dbUrl, setDbUrl] = useState('');
  const [isConnectingDb, setIsConnectingDb] = useState(false);

  const [isEditingPgd, setIsEditingPgd] = useState(false);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [tempPgdContent, setTempPgdContent] = useState(pgdContent);
  const [tempSpecContent, setTempSpecContent] = useState(specContent);
  const [isGeneratingOrders, setIsGeneratingOrders] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [isModelOn, setIsModelOn] = useState(true);
  const [selectedModelForOrders, setSelectedModelForOrders] = useState<string>(activeModels[0] || 'gemini-3.1-pro');

  useEffect(() => {
    if (activeModels.length > 0 && !activeModels.includes(selectedModelForOrders)) {
      setSelectedModelForOrders(activeModels[0]);
    }
  }, [activeModels, selectedModelForOrders]);

  useEffect(() => {
    // Automatically generate development orders when both PGD and SPEC are provided
    // and we don't already have orders
    const generateOrders = async () => {
      if (!isModelOn) return;
      if (pgdContent.trim() && specContent.trim() && developmentOrders.length === 0 && !isGeneratingOrders && !generationFailed) {
        setIsGeneratingOrders(true);
        try {
          const provider = (selectedModelForOrders as AIProvider) || 'gemini-3.1-pro';
          const orders = await generateDevelopmentOrders(pgdContent, specContent, provider);
          
          if (Array.isArray(orders)) {
            const formattedOrders = orders.map((order: any, index: number) => ({
              id: `order-${Date.now()}-${index}`,
              title: order.title || 'Untitled Task',
              description: order.description || 'No description provided',
              status: 'pending' as const
            }));
            setDevelopmentOrders(formattedOrders);
            setGenerationFailed(false);
            addLog('AI Task Breakdown', `Generated ${formattedOrders.length} development orders from PGD and SPEC.`);
          } else {
            setGenerationFailed(true);
          }
        } catch (error) {
          console.error("Failed to generate development orders:", error);
          setGenerationFailed(true);
        } finally {
          setIsGeneratingOrders(false);
        }
      }
    };

    generateOrders();
  }, [pgdContent, specContent, developmentOrders.length, activeModels, setDevelopmentOrders, addLog, isGeneratingOrders, generationFailed]);

  const handleSavePgd = () => {
    setPgdContent(tempPgdContent);
    setIsEditingPgd(false);
  };

  const handleSaveSpec = () => {
    setSpecContent(tempSpecContent);
    setIsEditingSpec(false);
  };

  const handlePgdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPgdContent(content);
      setTempPgdContent(content);
    };
    reader.readAsText(file);
    if (pgdInputRef.current) pgdInputRef.current.value = '';
  };

  const handleSpecFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSpecContent(content);
      setTempSpecContent(content);
    };
    reader.readAsText(file);
    if (specInputRef.current) specInputRef.current.value = '';
  };

  const handleConnectDb = async () => {
    if (!dbUrl) return;
    setIsConnectingDb(true);
    
    const queueId = Math.random().toString(36).substring(7);
    
    try {
      setUploadQueue(prev => [...prev, {
        id: queueId,
        name: `Connecting to ${dbType} database...`,
        progress: 20,
        status: 'processing'
      }]);

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, progress: 60 } : item
      ));

      // Simulate fetching schema
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockDbContent = JSON.stringify({
        tables: ['users', 'products', 'orders'],
        schema: {
          users: { id: 'uuid', name: 'string', email: 'string' },
          products: { id: 'uuid', name: 'string', price: 'number' }
        }
      }, null, 2);

      const blob = new Blob([mockDbContent], { type: 'application/json' });
      const file = new File([blob], `${dbType}-schema.json`, { type: 'application/json' });
      
      await addDataSource(file);
      
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, status: 'success', progress: 100, name: `Connected to ${dbType}` } : item
      ));
      
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== queueId));
      }, 3000);
      
      setDbUrl('');
    } catch (error) {
      console.error(error);
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, status: 'error', progress: 100, name: `Failed to connect to ${dbType}` } : item
      ));
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== queueId));
      }, 5000);
      alert(`Failed to connect to ${dbType} database. Please check your connection string.`);
    } finally {
      setIsConnectingDb(false);
    }
  };
  const handleFetchUrl = async () => {
    if (!urlInput) return;
    setIsFetchingUrl(true);
    
    const queueId = Math.random().toString(36).substring(7);
    let filename = 'fetched-data.txt';
    
    try {
      new URL(urlInput);
      
      let fetchUrl = urlInput;
      if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
        fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }

      const urlParts = fetchUrl.split('?')[0].split('/');
      filename = urlParts[urlParts.length - 1] || 'fetched-data.txt';
      if (!filename.includes('.')) filename += '.txt';

      setUploadQueue(prev => [...prev, {
        id: queueId,
        name: filename,
        progress: 10,
        status: 'processing'
      }]);

      // Use a CORS proxy for general URLs to avoid browser restrictions
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`;
      
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, progress: 40 } : item
      ));
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to fetch content from URL');
      
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, progress: 70 } : item
      ));
      
      const content = await response.text();
      
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], filename, { type: 'text/plain' });
      
      await addDataSource(file);
      
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, status: 'success', progress: 100 } : item
      ));
      
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== queueId));
      }, 3000);
      
      setUrlInput('');
    } catch (error) {
      console.error(error);
      setUploadQueue(prev => prev.map(item => 
        item.id === queueId ? { ...item, status: 'error', progress: 100 } : item
      ));
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== queueId));
      }, 5000);
      alert('Failed to fetch URL. Please ensure it is a valid, publicly accessible link.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newQueueItems = Array.from(files).map(f => ({
        id: Math.random().toString(36).substring(7),
        name: f.name,
        progress: 0,
        status: 'pending' as const
      }));
      
      setUploadQueue(prev => [...prev, ...newQueueItems]);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const queueId = newQueueItems[i].id;
        
        setUploadQueue(prev => prev.map(item => 
          item.id === queueId ? { ...item, status: 'processing', progress: 30 } : item
        ));

        try {
          setUploadQueue(prev => prev.map(item => 
            item.id === queueId ? { ...item, progress: 60 } : item
          ));
          
          await addDataSource(file);
          
          setUploadQueue(prev => prev.map(item => 
            item.id === queueId ? { ...item, status: 'success', progress: 100 } : item
          ));
          
          setTimeout(() => {
            setUploadQueue(prev => prev.filter(item => item.id !== queueId));
          }, 3000);
          
        } catch (error) {
          setUploadQueue(prev => prev.map(item => 
            item.id === queueId ? { ...item, status: 'error', progress: 100 } : item
          ));
          
          setTimeout(() => {
            setUploadQueue(prev => prev.filter(item => item.id !== queueId));
          }, 5000);
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'json': return <FileJson className="h-5 w-5 text-blue-500" />;
      case 'csv': return <Table className="h-5 w-5 text-green-500" />;
      case 'markdown': return <FileText className="h-5 w-5 text-zinc-500" />;
      default: return <FileText className="h-5 w-5 text-zinc-500" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Pipeline</h2>
          <p className="text-zinc-500 mt-2">Import, normalize, and manage your project data sources.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="flex relative w-full sm:w-64">
            <select
              value={dbType}
              onChange={(e) => setDbType(e.target.value)}
              className="absolute left-0 top-0 bottom-0 px-2 bg-zinc-100 dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 rounded-l-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
              disabled={isConnectingDb}
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mongodb">MongoDB</option>
              <option value="sqlite">SQLite</option>
            </select>
            <Input 
              placeholder="Database URL..." 
              className="pl-[90px] pr-20 bg-white dark:bg-zinc-950"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnectDb()}
              disabled={isConnectingDb}
            />
            <Button 
              size="sm" 
              className="absolute right-1 top-1 h-7 px-2"
              onClick={handleConnectDb}
              disabled={!dbUrl || isConnectingDb}
            >
              {isConnectingDb ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect'}
            </Button>
          </div>
          <div className="flex relative w-full sm:w-64">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Paste URL (GitHub, etc.)" 
              className="pl-9 pr-20 bg-white dark:bg-zinc-950"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
              disabled={isFetchingUrl}
            />
            <Button 
              size="sm" 
              className="absolute right-1 top-1 h-7 px-2"
              onClick={handleFetchUrl}
              disabled={!urlInput || isFetchingUrl}
            >
              {isFetchingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Fetch'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm hidden sm:inline-block">or</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
              accept=".json,.csv,.md,.txt,.py,.js,.ts,.tsx,.html,.css"
            />
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2 w-full sm:w-auto">
              <UploadCloud className="h-4 w-4" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>

      {uploadQueue.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Uploads in progress</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {uploadQueue.map(item => (
              <div key={item.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {item.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
                    {item.status === 'success' && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                    {item.status === 'error' && <X className="h-4 w-4 text-red-500 shrink-0" />}
                    {item.status === 'pending' && <UploadCloud className="h-4 w-4 text-zinc-400 shrink-0" />}
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-medium text-zinc-500 shrink-0">
                    {item.status === 'success' ? 'Complete' : item.status === 'error' ? 'Failed' : `${item.progress}%`}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ease-in-out ${
                      item.status === 'success' ? 'bg-green-500' : 
                      item.status === 'error' ? 'bg-red-500' : 
                      'bg-blue-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PGD Card */}
        <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Product Goal Document</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={pgdInputRef} 
                  onChange={handlePgdFileUpload} 
                  className="hidden" 
                  accept=".md,.txt"
                />
                <Button variant="outline" size="sm" onClick={() => pgdInputRef.current?.click()}>
                  Upload PGD.md
                </Button>
                {isEditingPgd ? (
                  <Button size="sm" onClick={handleSavePgd}>Save</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => { setTempPgdContent(pgdContent); setIsEditingPgd(true); }}>Edit</Button>
                )}
              </div>
            </div>
            <CardDescription>Align all AI models to your core product goals.</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingPgd ? (
              <Textarea 
                value={tempPgdContent}
                onChange={(e) => setTempPgdContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Enter your product goals here..."
              />
            ) : (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                {pgdContent ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{pgdContent}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                    <Target className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No Product Goal Document provided.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SPEC Card */}
        <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileBadge className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg">Specification Document</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={specInputRef} 
                  onChange={handleSpecFileUpload} 
                  className="hidden" 
                  accept=".md,.txt"
                />
                <Button variant="outline" size="sm" onClick={() => specInputRef.current?.click()}>
                  Upload SPEC.md
                </Button>
                {isEditingSpec ? (
                  <Button size="sm" onClick={handleSaveSpec}>Save</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => { setTempSpecContent(specContent); setIsEditingSpec(true); }}>Edit</Button>
                )}
              </div>
            </div>
            <CardDescription>Provide technical specifications for the AI to follow.</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingSpec ? (
              <Textarea 
                value={tempSpecContent}
                onChange={(e) => setTempSpecContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Enter your specifications here..."
              />
            ) : (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                {specContent ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{specContent}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                    <FileBadge className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No Specification Document provided.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="model-on-off"
              checked={isModelOn} 
              onChange={(e) => setIsModelOn(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <label htmlFor="model-on-off" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              Modell on/off
            </label>
          </div>
          {isModelOn && activeModels.length > 1 && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-zinc-200 dark:border-zinc-700">
              <span className="text-sm text-zinc-500">AI Model:</span>
              <select
                value={selectedModelForOrders}
                onChange={(e) => setSelectedModelForOrders(e.target.value)}
                className="text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1"
              >
                {Array.from(new Set(activeModels)).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {!isModelOn && developmentOrders.length === 0 && (
          <span className="text-xs text-zinc-500 italic">Automatic task breakdown is disabled.</span>
        )}
      </div>

      {isGeneratingOrders && (
        <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-900/5">
          <CardContent className="flex flex-col items-center justify-center h-32 text-center">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Analyzing PGD & SPEC...</h3>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80 mt-1">
              AI is breaking down your project into development orders.
            </p>
          </CardContent>
        </Card>
      )}

      {generationFailed && developmentOrders.length === 0 && !isGeneratingOrders && (
        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5">
          <CardContent className="flex flex-col items-center justify-center h-32 text-center">
            <X className="h-8 w-8 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Failed to Generate Orders</h3>
            <p className="text-sm text-red-600/80 dark:text-red-500/80 mt-1 mb-3">
              We couldn't automatically break down your project. Please check your API key or try again.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
              onClick={() => setGenerationFailed(false)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {developmentOrders.length > 0 && !isGeneratingOrders && (
        <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-900/5">
          <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg">AI-Generated Development Orders</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-zinc-500">
                  {developmentOrders.length} tasks identified
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20"
                  onClick={() => {
                    setDevelopmentOrders([]);
                    setGenerationFailed(false);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {developmentOrders.map((order) => (
                <div key={order.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{order.title}</h4>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      order.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-3" title={order.description}>
                    {order.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {dataSources.length === 0 ? (
          <Card className="border-dashed border-2 bg-zinc-50/50 dark:bg-zinc-900/50">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4 dark:bg-zinc-800">
                <UploadCloud className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold">No data sources yet</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-2">
                Fetch data from a URL or upload files to start building your project context.
              </p>
              <Button variant="outline" className="mt-6 gap-2" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="h-4 w-4" />
                Select Files to Upload
              </Button>
            </CardContent>
          </Card>
        ) : (
          dataSources.map((source) => (
            <Card key={source.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-md shadow-sm dark:bg-zinc-800">
                    {getIconForType(source.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{source.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span className="uppercase font-medium tracking-wider">{source.type}</span>
                      <span>•</span>
                      <span>Version {source.version}</span>
                      <span>•</span>
                      <span>{new Date(source.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <RefreshCw className="h-3 w-3" />
                    Update
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => removeDataSource(source.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-zinc-950 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                      <Layers className="h-4 w-4 text-zinc-500" />
                      Normalized Schema
                    </h4>
                    {source.normalized.schema.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {source.normalized.schema.slice(0, 15).map(key => (
                          <span key={key} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {key}
                          </span>
                        ))}
                        {source.normalized.schema.length > 15 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            +{source.normalized.schema.length - 15} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 italic">No structured schema detected.</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                      <Database className="h-4 w-4 text-zinc-500" />
                      Metadata
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(source.normalized.metadata).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-zinc-500">{k}:</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">LLM Context Preview</h4>
                  </div>
                  <div className="bg-zinc-950 text-zinc-50 p-4 rounded-md overflow-auto max-h-64 text-xs font-mono relative group flex-1 border border-zinc-800">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="absolute top-2 right-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700 z-10"
                      onClick={() => handleCopy(source.id, source.normalized.textContent)}
                    >
                      {copiedId === source.id ? (
                        <><Check className="h-3 w-3 text-green-500 mr-1.5" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1.5" /> Copy Context</>
                      )}
                    </Button>
                    <pre className="whitespace-pre-wrap break-words pt-1">
                      {source.normalized.textContent}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}
