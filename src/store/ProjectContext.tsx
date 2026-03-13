import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Papa from 'papaparse';
import { NormalizedDocument, normalizeCSV, normalizeJSON, normalizeMarkdown, normalizeCode } from '../lib/normalizer';

export type DataSourceType = 'csv' | 'json' | 'markdown' | 'code' | 'api';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  content: any; // Raw parsed content
  rawContent: string; // Raw string content
  normalized: NormalizedDocument; // Unified data structure
  timestamp: number;
  version: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: number;
}

interface ProjectContextType {
  dataSources: DataSource[];
  addDataSource: (file: File) => Promise<void>;
  removeDataSource: (id: string) => void;
  logs: ActivityLog[];
  addLog: (action: string, details: string) => void;
  getAggregatedContext: () => string;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const addLog = useCallback((action: string, details: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      action,
      details,
      timestamp: Date.now()
    }, ...prev]);
  }, []);

  const parseFile = (file: File): Promise<{ content: any, rawContent: string, type: DataSourceType, normalized: NormalizedDocument }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              const normalized = normalizeCSV(file.name, results.data, text);
              resolve({ content: results.data, rawContent: text, type: 'csv', normalized });
            },
            error: (error: any) => reject(error)
          });
        } else if (file.name.endsWith('.json')) {
          try {
            const json = JSON.parse(text);
            const normalized = normalizeJSON(file.name, json, text);
            resolve({ content: json, rawContent: text, type: 'json', normalized });
          } catch (err) {
            reject(err);
          }
        } else if (file.name.endsWith('.md')) {
          const normalized = normalizeMarkdown(file.name, text);
          resolve({ content: text, rawContent: text, type: 'markdown', normalized });
        } else {
          // Fallback to code/text for any other text-based file
          const normalized = normalizeCode(file.name, text);
          resolve({ content: text, rawContent: text, type: 'code', normalized });
        }
      };
      
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsText(file);
    });
  };

  const addDataSource = async (file: File) => {
    try {
      const { content, rawContent, type, normalized } = await parseFile(file);
      
      setDataSources(prev => {
        const existingIndex = prev.findIndex(ds => ds.name === file.name);
        if (existingIndex >= 0) {
          // Update existing
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content,
            rawContent,
            normalized,
            timestamp: Date.now(),
            version: updated[existingIndex].version + 1
          };
          addLog('Updated Source', `Normalized and updated ${file.name} to version ${updated[existingIndex].version}`);
          return updated;
        } else {
          // Add new
          const newSource: DataSource = {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type,
            content,
            rawContent,
            normalized,
            timestamp: Date.now(),
            version: 1
          };
          addLog('Added Source', `Imported and normalized ${file.name}`);
          return [...prev, newSource];
        }
      });
    } catch (error) {
      console.error("Error adding data source:", error);
      addLog('Error', `Failed to import ${file.name}`);
      throw error;
    }
  };

  const removeDataSource = (id: string) => {
    setDataSources(prev => {
      const source = prev.find(s => s.id === id);
      if (source) {
        addLog('Removed Source', `Removed ${source.name}`);
      }
      return prev.filter(ds => ds.id !== id);
    });
  };

  const getAggregatedContext = useCallback(() => {
    // We now use the normalized textContent which is optimized for the LLM
    return dataSources.map(ds => ds.normalized.textContent).join('\n\n---\n\n');
  }, [dataSources]);

  return (
    <ProjectContext.Provider value={{ dataSources, addDataSource, removeDataSource, logs, addLog, getAggregatedContext }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
