import React, { useRef, useState } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { UploadCloud, FileJson, FileText, Table, Trash2, RefreshCw, Database, Layers, Copy, Check, Link, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function DataSources() {
  const { dataSources, addDataSource, removeDataSource } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{id: string, name: string, progress: number, status: 'pending' | 'processing' | 'success' | 'error'}[]>([]);

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
