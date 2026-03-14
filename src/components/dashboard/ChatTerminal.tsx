import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Send, Bot, User, Plus, X, Terminal as TerminalIcon, Code, MessageSquare, Play, Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  codeContent: string;
  terminalOutput: string;
  activeRightTab: 'code' | 'terminal';
  currentPath: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
}

const initialFiles: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    isOpen: true,
    children: [
      {
        name: 'components',
        type: 'folder',
        isOpen: false,
        children: [
          { name: 'Button.tsx', type: 'file' },
          { name: 'Card.tsx', type: 'file' },
        ]
      },
      {
        name: 'pages',
        type: 'folder',
        isOpen: true,
        children: [
          { name: 'Dashboard.tsx', type: 'file' },
          { name: 'Insights.tsx', type: 'file' },
        ]
      },
      { name: 'App.tsx', type: 'file' },
      { name: 'main.tsx', type: 'file' },
    ]
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
  { name: 'vite.config.ts', type: 'file' },
];

export function ChatTerminal() {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      name: 'Session 1',
      messages: [
        { id: '1', role: 'assistant', content: 'Hello! I am ready to chat, write code, and run terminal commands. What would you like to build today?' }
      ],
      codeContent: '// Write or generate code here...\n\nfunction helloWorld() {\n  console.log("Hello from Nexus!");\n}\n',
      terminalOutput: '$ nexus start\nNexus environment initialized.\nReady for commands.\n',
      activeRightTab: 'code',
      currentPath: '/'
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('1');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>(initialFiles);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const updateSession = (id: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const createSession = () => {
    const newId = Date.now().toString();
    const newSession: Session = {
      id: newId,
      name: `Session ${sessions.length + 1}`,
      messages: [
        { id: Date.now().toString(), role: 'assistant', content: 'New session started. How can I help?' }
      ],
      codeContent: '// New file\n',
      terminalOutput: '$ \n',
      activeRightTab: 'code',
      currentPath: '/'
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
  };

  const closeSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sessions.length === 1) return; // Don't close the last session
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0].id);
    }
  };

  const executeCommand = (commandStr: string) => {
    const args = commandStr.trim().split(/\s+/);
    const cmd = args[0];
    let output = '';
    let newPath = activeSession.currentPath;

    const normalizePath = (base: string, target: string) => {
      if (target.startsWith('/')) base = '';
      const parts = (base + '/' + target).split('/').filter(p => p !== '' && p !== '.');
      const result: string[] = [];
      for (const p of parts) {
        if (p === '..') result.pop();
        else result.push(p);
      }
      return '/' + result.join('/');
    };

    const getDirectoryNodes = (path: string): FileNode[] | null => {
      if (path === '/') return fileTree;
      const parts = path.split('/').filter(p => p !== '');
      let current = fileTree;
      for (const part of parts) {
        const found = current.find(n => n.name === part);
        if (!found || found.type !== 'folder') return null;
        current = found.children || [];
      }
      return current;
    };

    const getNode = (path: string): FileNode | { type: 'folder', children: FileNode[] } | null => {
      if (path === '/') return { type: 'folder', children: fileTree } as any;
      const parts = path.split('/').filter(p => p !== '');
      let current = fileTree;
      let targetNode: FileNode | null = null;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const found = current.find(n => n.name === part);
        if (!found) return null;
        if (i === parts.length - 1) {
          targetNode = found;
        } else {
          if (found.type !== 'folder') return null;
          current = found.children || [];
        }
      }
      return targetNode;
    };

    if (cmd === 'clear') {
      updateSession(activeSessionId, { terminalOutput: '' });
      return;
    } else if (cmd === 'ls') {
      const targetDir = args[1] ? normalizePath(newPath, args[1]) : newPath;
      const dirNodes = getDirectoryNodes(targetDir);
      if (dirNodes) {
        output = dirNodes.map(n => n.name + (n.type === 'folder' ? '/' : '')).join('  ');
      } else {
        output = `ls: ${args[1]}: No such file or directory`;
      }
    } else if (cmd === 'cd') {
      const targetDir = args[1] || '/';
      const resolvedPath = normalizePath(newPath, targetDir);
      if (resolvedPath === '/') {
        newPath = '/';
      } else {
        const node = getNode(resolvedPath);
        if (node && node.type === 'folder') {
          newPath = resolvedPath;
        } else if (node && node.type === 'file') {
          output = `cd: ${args[1]}: Not a directory`;
        } else {
          output = `cd: ${args[1]}: No such file or directory`;
        }
      }
    } else if (cmd === 'cat') {
      if (!args[1]) {
        output = `cat: missing operand`;
      } else {
        const targetFile = normalizePath(newPath, args[1]);
        const node = getNode(targetFile);
        if (node && node.type === 'file') {
          output = `// Simulated content of ${args[1]}\n// This file is part of the project structure.`;
        } else if (node && node.type === 'folder') {
          output = `cat: ${args[1]}: Is a directory`;
        } else {
          output = `cat: ${args[1]}: No such file or directory`;
        }
      }
    } else if (cmd === 'pwd') {
      output = newPath;
    } else if (cmd === '') {
      output = '';
    } else {
      output = `Command not found: ${cmd}`;
    }

    if (commandStr.trim()) {
      setCommandHistory(prev => [...prev, commandStr]);
    }
    setHistoryIndex(-1);

    const newTerminalOutput = activeSession.terminalOutput + (activeSession.terminalOutput ? '\n' : '') + `${activeSession.currentPath} $ ${commandStr}` + (output ? '\n' + output : '');
    updateSession(activeSessionId, { 
      terminalOutput: newTerminalOutput,
      currentPath: newPath
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    updateSession(activeSessionId, {
      messages: [...activeSession.messages, userMsg]
    });
    setInput('');
    setIsLoading(true);

    // Simulate AI response with code/terminal interaction
    setTimeout(() => {
      const isCodeRequest = userMsg.content.toLowerCase().includes('code') || userMsg.content.toLowerCase().includes('function');
      const isTerminalRequest = userMsg.content.toLowerCase().includes('run') || userMsg.content.toLowerCase().includes('execute');
      
      let aiResponse = "I've processed your request.";
      let newCode = activeSession.codeContent;
      let newTerminal = activeSession.terminalOutput;
      let newTab = activeSession.activeRightTab;

      if (isCodeRequest) {
        aiResponse = "I've updated the code editor with the requested function.";
        newCode = activeSession.codeContent + `\n\n// Generated based on: ${userMsg.content}\nfunction generatedFunction() {\n  return "Success";\n}\n`;
        newTab = 'code';
      } else if (isTerminalRequest) {
        aiResponse = "I've executed the command in the terminal.";
        newTerminal = activeSession.terminalOutput + `\n$ ${userMsg.content}\nExecuting...\nDone. Output: Success.\n`;
        newTab = 'terminal';
      }

      const aiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: aiResponse };
      
      updateSession(activeSessionId, {
        messages: [...activeSession.messages, userMsg, aiMsg],
        codeContent: newCode,
        terminalOutput: newTerminal,
        activeRightTab: newTab
      });
      
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages]);

  const toggleFolder = (nodes: FileNode[], targetName: string): FileNode[] => {
    return nodes.map(node => {
      if (node.name === targetName && node.type === 'folder') {
        return { ...node, isOpen: !node.isOpen };
      }
      if (node.children) {
        return { ...node, children: toggleFolder(node.children, targetName) };
      }
      return node;
    });
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node, i) => (
      <div key={`${node.name}-${i}`}>
        <div 
          className={`flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 cursor-pointer text-sm ${depth > 0 ? 'ml-3 border-l border-zinc-200 dark:border-zinc-800' : ''}`}
          onClick={() => node.type === 'folder' && setFileTree(toggleFolder(fileTree, node.name))}
        >
          {node.type === 'folder' ? (
            <>
              {node.isOpen ? <ChevronDown className="h-3 w-3 text-zinc-400" /> : <ChevronRight className="h-3 w-3 text-zinc-400" />}
              <Folder className="h-3.5 w-3.5 text-blue-500" />
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="h-3.5 w-3.5 text-zinc-400" />
            </>
          )}
          <span className="truncate text-zinc-700 dark:text-zinc-300">{node.name}</span>
        </div>
        {node.type === 'folder' && node.isOpen && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <Card className="flex flex-col h-[700px] overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-md">
      {/* Top Tabs Bar */}
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            className={`group flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer border-r border-zinc-200 dark:border-zinc-800 transition-colors min-w-[140px] max-w-[200px] ${
              activeSessionId === session.id
                ? 'bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-600 dark:border-b-blue-400'
                : 'text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">{session.name}</span>
            {sessions.length > 1 && (
              <button
                onClick={(e) => closeSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={createSession}
          className="p-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
          title="New Session"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Browser */}
        <div className="w-48 flex-shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Explorer
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {/* Middle: Chat */}
        <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30 min-w-[300px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSession.messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`flex-1 px-4 py-3 rounded-2xl max-w-[85%] ${
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
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center">
                  <Bot className="h-4 w-4 animate-pulse" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-tl-sm shadow-sm flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI or ask to write code/run commands..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-900"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Right: Code/Terminal */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] text-zinc-300 min-w-[300px]">
          <div className="flex items-center bg-[#2d2d2f] border-b border-zinc-800">
            <button
              onClick={() => updateSession(activeSessionId, { activeRightTab: 'code' })}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeSession.activeRightTab === 'code'
                  ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-t-blue-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1e1e1e]/50 border-t-2 border-t-transparent'
              }`}
            >
              <Code className="h-4 w-4" />
              Editor
            </button>
            <button
              onClick={() => updateSession(activeSessionId, { activeRightTab: 'terminal' })}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeSession.activeRightTab === 'terminal'
                  ? 'bg-[#1e1e1e] text-emerald-400 border-t-2 border-t-emerald-500'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1e1e1e]/50 border-t-2 border-t-transparent'
              }`}
            >
              <TerminalIcon className="h-4 w-4" />
              Terminal
            </button>
            <div className="flex-1" />
            {activeSession.activeRightTab === 'code' && (
              <button className="flex items-center gap-1.5 px-3 py-1 mr-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors">
                <Play className="h-3 w-3" />
                Run Code
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden font-mono text-sm leading-relaxed flex flex-col">
            {activeSession.activeRightTab === 'code' ? (
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  language="javascript"
                  theme="vs-dark"
                  value={activeSession.codeContent}
                  onChange={(value) => updateSession(activeSessionId, { codeContent: value || '' })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: 1.5,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4 bg-[#0d0d0d] whitespace-pre-wrap text-emerald-400">
                {activeSession.terminalOutput}
                <div className="flex items-center mt-2">
                  <span className="text-emerald-500 mr-2">{activeSession.currentPath} $</span>
                  <input 
                    type="text" 
                    className="flex-1 bg-transparent focus:outline-none text-zinc-300" 
                    placeholder="Type a command..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value;
                        executeCommand(val);
                        e.currentTarget.value = '';
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (commandHistory.length > 0) {
                          const newIndex = historyIndex === -1 
                            ? commandHistory.length - 1 
                            : Math.max(0, historyIndex - 1);
                          setHistoryIndex(newIndex);
                          e.currentTarget.value = commandHistory[newIndex];
                        }
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (historyIndex !== -1) {
                          const newIndex = historyIndex + 1;
                          if (newIndex >= commandHistory.length) {
                            setHistoryIndex(-1);
                            e.currentTarget.value = '';
                          } else {
                            setHistoryIndex(newIndex);
                            e.currentTarget.value = commandHistory[newIndex];
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
