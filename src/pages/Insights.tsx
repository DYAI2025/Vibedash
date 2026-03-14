import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { generateProjectInsights, AIProvider } from '@/src/lib/ai';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Send, Bot, User, Loader2, Search, X, Settings, Eye, EyeOff, FileText, Save, FileEdit, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
}

interface SearchResult {
  sourceId: string;
  name: string;
  match: string;
}

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group rounded-md overflow-hidden my-4 border border-zinc-700">
        <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-mono">
          <span>{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem', background: '#1e1e1e' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className={`${className} bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-sm`} {...props}>
      {children}
    </code>
  );
};

export function Insights() {
  const { getAggregatedContext, dataSources, pgdContent, specContent, setPgdContent, setSpecContent, addLog, activeModels, setActiveModels, hasOpenAIKey, hasAnthropicKey } = useProject();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Nexus AI assistant. I have access to all your loaded project data. How can I help you analyze the current project state, summarize changes, or extract insights?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider1, setProvider1] = useState<AIProvider>((activeModels[0] as AIProvider) || 'gemini-3.1-pro');
  const [provider2, setProvider2] = useState<AIProvider>((activeModels[1] as AIProvider) || (hasOpenAIKey ? 'gpt-5.4' : 'gemini-3.1-pro'));
  const [provider3, setProvider3] = useState<AIProvider>((activeModels[2] as AIProvider) || (hasAnthropicKey ? 'claude-opus-4.6' : 'gemini-3.1-pro'));
  const [activeSlots, setActiveSlots] = useState<number[]>(activeModels.length > 0 ? activeModels.map((_, i) => i + 1) : [1]);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  useEffect(() => {
    if (!hasOpenAIKey) {
      if (provider1.startsWith('gpt-')) setProvider1('gemini-3.1-pro');
      if (provider2.startsWith('gpt-')) setProvider2('gemini-3.1-pro');
      if (provider3.startsWith('gpt-')) setProvider3('gemini-3.1-pro');
    }
    if (!hasAnthropicKey) {
      if (provider1.startsWith('claude-')) setProvider1('gemini-3.1-pro');
      if (provider2.startsWith('claude-')) setProvider2('gemini-3.1-pro');
      if (provider3.startsWith('claude-')) setProvider3('gemini-3.1-pro');
    }
  }, [hasOpenAIKey, hasAnthropicKey, provider1, provider2, provider3]);

  useEffect(() => {
    const currentActiveModels = activeSlots.map(slot => 
      slot === 1 ? provider1 : slot === 2 ? provider2 : provider3
    );
    // Only update if different to avoid infinite loops
    if (JSON.stringify(currentActiveModels) !== JSON.stringify(activeModels)) {
      setActiveModels(currentActiveModels);
    }
  }, [activeSlots, provider1, provider2, provider3, activeModels, setActiveModels]);

  const toggleSlot = (slot: number) => {
    if (activeSlots.includes(slot)) {
      if (activeSlots.length === 1) return; // Prevent deactivating all
      setActiveSlots(prev => prev.filter(s => s !== slot));
    } else {
      if (activeSlots.length === 2) {
        setPendingSlot(slot);
        setShowTokenWarning(true);
      } else {
        setActiveSlots(prev => [...prev, slot]);
      }
    }
  };

  const confirmActivateAll = () => {
    if (pendingSlot) {
      setActiveSlots(prev => [...prev, pendingSlot]);
    }
    setShowTokenWarning(false);
    setPendingSlot(null);
  };

  const cancelActivateAll = () => {
    setShowTokenWarning(false);
    setPendingSlot(null);
  };

  const [activeTab, setActiveTab] = useState<'chat' | 'pgd' | 'spec'>('chat');
  const [localPgd, setLocalPgd] = useState(pgdContent);
  const [localSpec, setLocalSpec] = useState(specContent);
  const [isEditingPgd, setIsEditingPgd] = useState(false);
  const [isEditingSpec, setIsEditingSpec] = useState(false);

  useEffect(() => {
    setLocalPgd(pgdContent);
  }, [pgdContent]);

  useEffect(() => {
    setLocalSpec(specContent);
  }, [specContent]);

  const handleSavePgd = () => {
    setPgdContent(localPgd);
    setIsEditingPgd(false);
    addLog('Updated Document', 'Saved changes to Product Goal Document (PGD.md)');
  };

  const handleSaveSpec = () => {
    setSpecContent(localSpec);
    setIsEditingSpec(false);
    addLog('Updated Document', 'Saved changes to Specification Document (SPEC.md)');
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const getActiveProviders = () => {
    return activeSlots.map(slot => 
      slot === 1 ? provider1 : slot === 2 ? provider2 : provider3
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    
    dataSources.forEach(source => {
      const text = source.normalized.textContent.toLowerCase();
      const index = text.indexOf(query);
      
      if (index !== -1) {
        // Extract a snippet around the match
        const start = Math.max(0, index - 40);
        const end = Math.min(text.length, index + query.length + 40);
        let snippet = source.normalized.textContent.substring(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        
        results.push({
          sourceId: source.id,
          name: source.name,
          match: snippet
        });
      }
    });
    
    setSearchResults(results);
  }, [searchQuery, dataSources]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const context = getAggregatedContext();
      if (!context.trim() && dataSources.length === 0) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I don't have any project data loaded yet. Please go to the Data Sources tab and upload some files (CSV, JSON, Markdown) so I can analyze your project."
        }]);
        setIsLoading(false);
        return;
      }

      const activeProviders = getActiveProviders();
      const promises = activeProviders.map(provider => 
        generateProjectInsights(context, userMsg.content, provider)
          .then(res => ({ provider, content: res, error: null }))
          .catch(err => ({ provider, content: null, error: err }))
      );

      const results = await Promise.all(promises);

      const newMessages = results.map((res, index) => ({
        id: Date.now().toString() + '-' + index,
        role: 'assistant' as const,
        content: res.error ? "Sorry, I encountered an error while analyzing the data. Please ensure your API key is set correctly and try again." : res.content!,
        provider: res.provider
      }));

      setMessages(prev => [...prev, ...newMessages]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while analyzing the data."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to highlight the search term in the snippet
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 font-medium rounded-sm px-0.5">{part}</span> : part
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col"
    >
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-20">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">LLM Insights Engine</h2>
            <p className="text-zinc-500 mt-2">Interact with AI models to interpret your project's current state and historical context.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-80 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search project context..." 
              className="pl-9 pr-9 bg-white dark:bg-zinc-950"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <AnimatePresence>
            {searchQuery && isSearchFocused && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50"
              >
                {searchResults.length > 0 ? (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Found in {searchResults.length} source{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    {searchResults.map((res, i) => (
                      <div 
                        key={i} 
                        className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-md cursor-pointer transition-colors"
                        onClick={() => {
                          setInput(`Tell me more about "${searchQuery}" from ${res.name}`);
                          setSearchQuery('');
                        }}
                      >
                        <div className="font-medium text-xs text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          {res.name}
                        </div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
                          {highlightMatch(res.match, searchQuery)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-sm text-zinc-500 text-center flex flex-col items-center gap-2">
                    <Search className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                    <p>No results found in context for "{searchQuery}"</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant={activeTab === 'chat' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('chat')}
        >
          <Bot className="w-4 h-4 mr-2" />
          AI Chat
        </Button>
        <Button 
          variant={activeTab === 'pgd' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('pgd')}
        >
          <FileText className="w-4 h-4 mr-2" />
          PGD.md
        </Button>
        <Button 
          variant={activeTab === 'spec' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('spec')}
        >
          <FileText className="w-4 h-4 mr-2" />
          SPEC.md
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-md relative z-10">
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30 dark:bg-zinc-950/30">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`flex-1 px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'max-w-[80%]' : 'w-full'} ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm' 
                      : 'bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0">
                        {msg.provider && (
                          <div className="text-xs font-semibold text-zinc-500 mb-2 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            {msg.provider}
                          </div>
                        )}
                        <ReactMarkdown components={{ code: CodeBlock }}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    <span className="text-sm text-zinc-500">Analyzing context with {activeSlots.length} model{activeSlots.length > 1 ? 's' : ''}...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-4 mb-4">
                {[1, 2, 3].map((slot) => (
                  <div 
                    key={slot}
                    onClick={() => toggleSlot(slot)}
                    className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${
                      activeSlots.includes(slot) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Slot {slot}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Modell on/off</span>
                        <input 
                          type="checkbox" 
                          checked={activeSlots.includes(slot)} 
                          onChange={() => toggleSlot(slot)} 
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                    </div>
                    <select
                      value={slot === 1 ? provider1 : slot === 2 ? provider2 : provider3}
                      onChange={(e) => {
                        const val = e.target.value as AIProvider;
                        if (slot === 1) setProvider1(val);
                        else if (slot === 2) setProvider2(val);
                        else setProvider3(val);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
                      disabled={isLoading}
                    >
                      <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                      {hasOpenAIKey && <option value="gpt-5.4">OpenAI GPT 5.4</option>}
                      {hasAnthropicKey && (
                        <>
                          <option value="claude-opus-4.6">Claude Opus 4.6</option>
                          <option value="claude-sonnet-4.6">Claude Sonnet 4.6</option>
                        </>
                      )}
                    </select>
                  </div>
                ))}
              </div>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${activeSlots.length} active model${activeSlots.length > 1 ? 's' : ''} about project status, data structures, or recent changes...`}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="mt-2 text-center">
                <p className="text-xs text-zinc-400">
                  Context size: {dataSources.length} sources loaded. {activeSlots.length} model{activeSlots.length > 1 ? 's' : ''} will use this data to answer.
                </p>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'pgd' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Product Goal Document (PGD.md)</h3>
                <p className="text-sm text-zinc-500">Define the high-level goals and vision for your product.</p>
              </div>
              {isEditingPgd ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setLocalPgd(pgdContent); setIsEditingPgd(false); }}>Cancel</Button>
                  <Button onClick={handleSavePgd}><Save className="w-4 h-4 mr-2" /> Save</Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditingPgd(true)}><FileEdit className="w-4 h-4 mr-2" /> Edit</Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md border-zinc-200 dark:border-zinc-800">
              {isEditingPgd ? (
                <Textarea 
                  value={localPgd} 
                  onChange={(e) => setLocalPgd(e.target.value)} 
                  className="w-full h-full min-h-[400px] p-4 font-mono text-sm resize-none border-none focus-visible:ring-0"
                  placeholder="# Product Goal Document\n\nEnter your product goals here..."
                />
              ) : (
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  {pgdContent ? <ReactMarkdown>{pgdContent}</ReactMarkdown> : <p className="text-zinc-500 italic">No content yet. Click Edit to add product goals.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'spec' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Specification Document (SPEC.md)</h3>
                <p className="text-sm text-zinc-500">Define the technical specifications and requirements.</p>
              </div>
              {isEditingSpec ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setLocalSpec(specContent); setIsEditingSpec(false); }}>Cancel</Button>
                  <Button onClick={handleSaveSpec}><Save className="w-4 h-4 mr-2" /> Save</Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditingSpec(true)}><FileEdit className="w-4 h-4 mr-2" /> Edit</Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md border-zinc-200 dark:border-zinc-800">
              {isEditingSpec ? (
                <Textarea 
                  value={localSpec} 
                  onChange={(e) => setLocalSpec(e.target.value)} 
                  className="w-full h-full min-h-[400px] p-4 font-mono text-sm resize-none border-none focus-visible:ring-0"
                  placeholder="# Specification Document\n\nEnter your technical specifications here..."
                />
              ) : (
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  {specContent ? <ReactMarkdown>{specContent}</ReactMarkdown> : <p className="text-zinc-500 italic">No content yet. Click Edit to add specifications.</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Token Warning Modal */}
      <AnimatePresence>
        {showTokenWarning && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={cancelActivateAll}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-zinc-950 rounded-xl shadow-2xl z-50 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">High Token Usage Warning</h3>
                  <button 
                    onClick={cancelActivateAll}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  Are you sure you want to activate all 3 models? This will send the entire project context to 3 different models simultaneously, which will result in high token usage and potentially higher costs.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={cancelActivateAll}>
                    Cancel
                  </Button>
                  <Button onClick={confirmActivateAll} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Activate All
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
