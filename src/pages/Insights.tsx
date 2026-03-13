import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { generateProjectInsights, AIProvider } from '@/src/lib/ai';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Send, Bot, User, Loader2, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SearchResult {
  sourceId: string;
  name: string;
  match: string;
}

export function Insights() {
  const { getAggregatedContext, dataSources } = useProject();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Nexus AI assistant. I have access to all your loaded project data. How can I help you analyze the current project state, summarize changes, or extract insights?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('google');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

      const response = await generateProjectInsights(context, userMsg.content, provider);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while analyzing the data. Please ensure your API key is set correctly and try again."
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">LLM Insights Engine</h2>
          <p className="text-zinc-500 mt-2">Interact with Gemini to interpret your project's current state and historical context.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <div className="relative">
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

      <Card className="flex-1 flex flex-col overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-md relative z-10">
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
              <div className={`flex-1 px-4 py-3 rounded-2xl max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm' 
                  : 'bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-tl-sm shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:text-zinc-50">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
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
                <span className="text-sm text-zinc-500">Analyzing context...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="google">Google Gemini</option>
              <option value="openai">OpenAI GPT-4o</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about project status, data structures, or recent changes..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-2 text-center">
            <p className="text-xs text-zinc-400">
              Context size: {dataSources.length} sources loaded. {provider === 'google' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Claude'} will use this data to answer.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
