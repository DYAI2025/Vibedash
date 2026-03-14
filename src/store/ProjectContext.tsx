import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
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

export interface DevelopmentOrder {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  dataSources: { name: string; type: DataSourceType; rawContent: string }[];
  pgdContent: string;
  specContent: string;
  models: string[];
}

interface ProjectContextType {
  dataSources: DataSource[];
  addDataSource: (file: File) => Promise<void>;
  removeDataSource: (id: string) => void;
  logs: ActivityLog[];
  addLog: (action: string, details: string) => void;
  getAggregatedContext: () => string;
  pgdContent: string;
  setPgdContent: (content: string) => void;
  specContent: string;
  setSpecContent: (content: string) => void;
  templates: ProjectTemplate[];
  saveAsTemplate: (name: string, description: string, models: string[]) => void;
  loadTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => void;
  activeModels: string[];
  setActiveModels: (models: string[]) => void;
  developmentOrders: DevelopmentOrder[];
  setDevelopmentOrders: (orders: DevelopmentOrder[]) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DEFAULT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 't-1',
    name: 'E-commerce Analytics',
    description: 'Pre-configured setup for analyzing e-commerce sales data, customer behavior, and inventory.',
    icon: 'shopping-cart',
    dataSources: [
      {
        name: 'sample_sales.csv',
        type: 'csv',
        rawContent: 'date,product_id,category,price,quantity,customer_id\n2023-01-01,P1001,Electronics,299.99,2,C501\n2023-01-02,P1002,Clothing,45.50,1,C502\n2023-01-03,P1001,Electronics,299.99,1,C503'
      }
    ],
    pgdContent: '# E-commerce Analytics Goal\n\nAnalyze sales trends to identify top-performing categories and optimize inventory management.',
    specContent: '# Technical Specs\n\n- Data: Daily sales CSV\n- Metrics: Revenue, Units Sold, Top Categories\n- AI Task: Predict next month sales trend.',
    models: ['gemini-3.1-pro', 'gpt-5.4']
  },
  {
    id: 't-2',
    name: 'Customer Support Triage',
    description: 'Pipeline for analyzing customer support tickets, categorizing issues, and generating automated responses.',
    icon: 'headphones',
    dataSources: [
      {
        name: 'tickets.json',
        type: 'json',
        rawContent: '[\n  {"id": "T1", "subject": "Login issue", "status": "open", "priority": "high"},\n  {"id": "T2", "subject": "Billing question", "status": "closed", "priority": "medium"}\n]'
      }
    ],
    pgdContent: '# Support Triage Goal\n\nAutomatically categorize incoming support tickets and suggest resolution steps to agents.',
    specContent: '# Technical Specs\n\n- Data: JSON array of tickets\n- Categories: Technical, Billing, General\n- AI Task: Classify new tickets and draft responses.',
    models: ['claude-opus-4.6']
  }
];

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pgdContent, setPgdContent] = useState<string>('');
  const [specContent, setSpecContent] = useState<string>('');
  const [activeModels, setActiveModels] = useState<string[]>(['gemini-3.1-pro']);
  const [developmentOrders, setDevelopmentOrders] = useState<DevelopmentOrder[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>(() => {
    const saved = localStorage.getItem('nexus_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_TEMPLATES;
      }
    }
    return DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    localStorage.setItem('nexus_templates', JSON.stringify(templates));
  }, [templates]);

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

  const saveAsTemplate = (name: string, description: string, models: string[]) => {
    const newTemplate: ProjectTemplate = {
      id: `t-${Date.now()}`,
      name,
      description,
      dataSources: dataSources.map(ds => ({
        name: ds.name,
        type: ds.type,
        rawContent: ds.rawContent
      })),
      pgdContent,
      specContent,
      models
    };
    setTemplates(prev => [...prev, newTemplate]);
    addLog('Template Created', `Saved current project as template: ${name}`);
  };

  const loadTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Clear current state
    setDataSources([]);
    setPgdContent(template.pgdContent);
    setSpecContent(template.specContent);
    setActiveModels(template.models.length > 0 ? template.models : ['gemini-3.1-pro']);
    setDevelopmentOrders([]);
    setLogs([]); // Optional: clear logs on new template load

    // Load data sources
    for (const ds of template.dataSources) {
      // Create a File object from the raw content
      const blob = new Blob([ds.rawContent], { type: 'text/plain' });
      const file = new File([blob], ds.name, { type: 'text/plain' });
      await addDataSource(file);
    }
    
    addLog('Template Loaded', `Loaded template: ${template.name}`);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    addLog('Template Deleted', `Deleted template ID: ${templateId}`);
  };

  const getAggregatedContext = useCallback(() => {
    // We now use the normalized textContent which is optimized for the LLM
    let context = '';
    if (pgdContent) {
      context += `--- PRODUCT GOAL DOCUMENT (PGD.md) ---\n${pgdContent}\n\n`;
    }
    if (specContent) {
      context += `--- SPECIFICATION DOCUMENT (SPEC.md) ---\n${specContent}\n\n`;
    }
    const sourcesContext = dataSources.map(ds => ds.normalized.textContent).join('\n\n---\n\n');
    if (sourcesContext) {
      context += `--- ADDITIONAL DATA SOURCES ---\n${sourcesContext}`;
    }
    return context;
  }, [dataSources, pgdContent, specContent]);

  return (
    <ProjectContext.Provider value={{ 
      dataSources, addDataSource, removeDataSource, logs, addLog, getAggregatedContext,
      pgdContent, setPgdContent, specContent, setSpecContent,
      templates, saveAsTemplate, loadTemplate, deleteTemplate,
      activeModels, setActiveModels,
      developmentOrders, setDevelopmentOrders
    }}>
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
