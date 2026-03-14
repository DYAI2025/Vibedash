import React, { useState } from 'react';
import { useProject } from '@/src/store/ProjectContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Play, ShoppingCart, Headphones, FileText, Database, Code, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const iconMap: Record<string, React.ReactNode> = {
  'shopping-cart': <ShoppingCart className="w-6 h-6" />,
  'headphones': <Headphones className="w-6 h-6" />,
  'file-text': <FileText className="w-6 h-6" />,
  'database': <Database className="w-6 h-6" />,
  'code': <Code className="w-6 h-6" />
};

export function Templates() {
  const { templates, saveAsTemplate, loadTemplate, deleteTemplate, activeModels } = useProject();
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    saveAsTemplate(newTemplateName, newTemplateDesc, activeModels);
    setIsCreating(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
  };

  const handleUseTemplate = async (templateId: string) => {
    setLoadingTemplate(templateId);
    try {
      await loadTemplate(templateId);
      navigate('/');
    } catch (error) {
      console.error("Failed to load template", error);
    } finally {
      setLoadingTemplate(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Project Templates</h2>
          <p className="text-zinc-500 mt-2">Quickly set up new projects with pre-configured data pipelines and AI models.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Save Current as Template
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
              <CardHeader>
                <CardTitle className="text-lg">Save Current Project as Template</CardTitle>
                <CardDescription>This will save your current data sources, PGD, and SPEC documents as a reusable template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name</label>
                  <Input 
                    placeholder="e.g., Marketing Campaign Analysis" 
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    placeholder="Briefly describe what this template is for..." 
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    className="resize-none h-20"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300">
                  {template.icon ? iconMap[template.icon] || <Database className="w-6 h-6" /> : <Database className="w-6 h-6" />}
                </div>
                {template.id.startsWith('t-') && template.id.length < 5 ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium rounded-full">
                    Official
                  </span>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardTitle className="text-xl">{template.name}</CardTitle>
              <CardDescription className="line-clamp-2 h-10">{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pre-configured Data</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.dataSources.length > 0 ? (
                      template.dataSources.map((ds, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          <FileText className="w-3 h-3 mr-1" />
                          {ds.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-400 italic">No data sources</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI Models</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.models.map((model, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button 
                className="w-full" 
                onClick={() => handleUseTemplate(template.id)}
                disabled={loadingTemplate === template.id}
              >
                {loadingTemplate === template.id ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Play className="w-4 h-4 mr-2" />
                    Use Template
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
