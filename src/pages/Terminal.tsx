import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal as TerminalIcon, Save, Play, Loader2, Trash2 } from 'lucide-react';
import { useProject } from '@/src/store/ProjectContext';
import { Button } from '@/src/components/ui/button';
import Editor from '@monaco-editor/react';

declare global {
  interface Window {
    loadPyodide: any;
  }
}

export function Terminal() {
  const [code, setCode] = useState('# Welcome to Nexus Python Terminal\n# Write your code here...\n\ndef hello_world():\n    print("Hello from Nexus Python!")\n\nhello_world()\n');
  const [filename, setFilename] = useState('script.py');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);
  const pyodideRef = useRef<any>(null);
  const { addDataSource, addLog } = useProject();

  useEffect(() => {
    let isMounted = true;

    const initPyodide = async () => {
      try {
        if (!window.loadPyodide) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }
        
        if (!isMounted) return;

        pyodideRef.current = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
          stdout: (text: string) => {
            setOutput(prev => prev + text + '\n');
          },
          stderr: (text: string) => {
            setOutput(prev => prev + text + '\n');
          }
        });
        
        if (isMounted) {
          setIsPyodideLoading(false);
          addLog('Terminal', 'Python interpreter loaded successfully');
        }
      } catch (error) {
        console.error('Failed to load Pyodide:', error);
        if (isMounted) {
          setOutput('Failed to load Python interpreter. Please check your connection.\n');
          setIsPyodideLoading(false);
        }
      }
    };

    initPyodide();

    return () => {
      isMounted = false;
    };
  }, [addLog]);

  const handleRunCode = async () => {
    if (!pyodideRef.current || isRunning) return;
    
    setIsRunning(true);
    setOutput(prev => prev + `\n$ python ${filename}\n`);
    
    try {
      await pyodideRef.current.runPythonAsync(code);
    } catch (error: any) {
      setOutput(prev => prev + error.toString() + '\n');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearOutput = () => {
    setOutput('');
  };

  const handleSaveToContext = async () => {
    // Create a File object from the code
    const blob = new Blob([code], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    
    try {
      await addDataSource(file);
      addLog('Terminal', `Saved ${filename} to project context`);
    } catch (error) {
      console.error(error);
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      default: return 'plaintext';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-8 h-[calc(100vh-4rem)] flex flex-col"
    >
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Terminal Editor</h2>
          <p className="text-zinc-500 mt-2">Write code, execute Python in the browser, and add it to your LLM context.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-1">
            <span className="text-sm text-zinc-500">File:</span>
            <input 
              type="text" 
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-mono w-32 dark:text-zinc-100"
            />
          </div>
          <Button onClick={handleSaveToContext} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Save to Context
          </Button>
          <Button 
            onClick={handleRunCode} 
            disabled={isPyodideLoading || isRunning || getLanguage(filename) !== 'python'}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            title={getLanguage(filename) !== 'python' ? "Only Python execution is currently supported in browser" : ""}
          >
            {isPyodideLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Code
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden shadow-2xl border border-zinc-800/50 flex flex-col bg-[#1e1e1e]">
        {/* macOS Window Header */}
        <div className="h-10 bg-[#2d2d2f] flex items-center px-4 relative shrink-0">
          <div className="flex gap-2 absolute left-4">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
          </div>
          <div className="mx-auto text-[#98989d] text-xs font-medium font-sans flex items-center gap-2">
            <TerminalIcon className="h-3 w-3" />
            {filename} — {getLanguage(filename)} — 80x24
          </div>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 overflow-hidden relative border-b md:border-b-0 md:border-r border-zinc-800">
            <Editor
              height="100%"
              language={getLanguage(filename)}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
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
          
          {/* Output Console */}
          <div className="flex-1 flex flex-col bg-[#0d0d0d] relative">
            <div className="h-8 bg-[#1a1a1a] flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
              <span className="text-xs font-mono text-zinc-400">Output Console</span>
              <button 
                onClick={handleClearOutput}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Clear Output"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {isPyodideLoading ? (
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-[13px]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initializing Python environment...
                </div>
              ) : (
                <pre className="text-[#a6e22e] font-mono text-[13px] whitespace-pre-wrap break-words">
                  {output || 'Ready.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
