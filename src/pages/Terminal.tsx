import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal as TerminalIcon, Save } from 'lucide-react';
import { useProject } from '@/src/store/ProjectContext';
import { Button } from '@/src/components/ui/button';

export function Terminal() {
  const [code, setCode] = useState('// Welcome to Nexus Terminal\n// Write your code here...\n\nfunction helloWorld() {\n  console.log("Hello from Nexus!");\n}\n');
  const [filename, setFilename] = useState('script.js');
  const { addDataSource, addLog } = useProject();

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-8 h-[calc(100vh-4rem)] flex flex-col"
    >
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Terminal Editor</h2>
          <p className="text-zinc-500 mt-2">Write code directly in the app and add it to your LLM context.</p>
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
          <Button onClick={handleSaveToContext} className="gap-2">
            <Save className="h-4 w-4" />
            Save to Context
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden shadow-2xl border border-zinc-800/50 flex flex-col bg-[#1c1c1e]">
        {/* macOS Window Header */}
        <div className="h-10 bg-[#2d2d2f] flex items-center px-4 relative shrink-0">
          <div className="flex gap-2 absolute left-4">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
          </div>
          <div className="mx-auto text-[#98989d] text-xs font-medium font-sans flex items-center gap-2">
            <TerminalIcon className="h-3 w-3" />
            {filename} — bash — 80x24
          </div>
        </div>
        
        {/* Terminal Body */}
        <div className="flex-1 p-4 overflow-hidden relative">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-transparent text-[#f8f8f2] font-mono text-[13px] leading-relaxed resize-none outline-none selection:bg-[#4af626]/30"
            placeholder="Type your code here..."
          />
        </div>
      </div>
    </motion.div>
  );
}
