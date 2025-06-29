import React, { useEffect, useState } from 'react';
import { 
  Palette, 
  Bot, 
  Database, 
  Shield, 
  Monitor,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Square,
  RefreshCw
} from 'lucide-react';
import { useThemeStore, Theme } from '../stores/theme';
import { useModelsStore } from '../stores/models';
import toast from 'react-hot-toast';

const Settings = () => {
  const { currentTheme, setTheme, themes } = useThemeStore();
  const { 
    models, 
    modelStatus, 
    healthStatus, 
    fetchModels, 
    launchModel, 
    stopModel, 
    checkModelStatus,
    checkHealth 
  } = useModelsStore();
  
  const [modelConfig, setModelConfig] = useState({
    modelPath: '',
    port: 5001,
    threads: 4,
    context: 2048
  });
  
  const [editorSettings, setEditorSettings] = useState({
    autocomplete: true,
    minimap: true,
    wordWrap: 'on',
    fontSize: 14,
    theme: 'vs-dark'
  });
  
  useEffect(() => {
    fetchModels();
    checkModelStatus();
    checkHealth();
  }, []);
  
  const handleLaunchModel = async () => {
    if (!modelConfig.modelPath) {
      toast.error('Please select a model file');
      return;
    }
    
    try {
      await launchModel({
        modelPath: modelConfig.modelPath,
        port: modelConfig.port,
        config: {
          threads: modelConfig.threads,
          context: modelConfig.context
        }
      });
    } catch (error) {
      console.error('Failed to launch model:', error);
    }
  };
  
  const handleStopModel = async (port: number) => {
    try {
      await stopModel(port);
    } catch (error) {
      console.error('Failed to stop model:', error);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
      case 'starting':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error':
      case 'inactive':
        return <XCircle className="w-4 h-4 text-error" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted" />;
    }
  };
  
  const saveSettings = async () => {
    try {
      // Save settings to backend
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: { current: currentTheme },
          editor: editorSettings
        })
      });
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted">Configure your AI Dashboard Platform</p>
      </div>
      
      {/* Theme Settings */}
      <section className="card">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Theme</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setTheme(key as Theme)}
              className={`p-4 border rounded-lg text-left transition-all ${
                currentTheme === key 
                  ? 'border-accent bg-accent/10' 
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className={`w-full h-8 rounded mb-3 theme-preview-${key}`} />
              <h3 className="font-medium">{theme.name}</h3>
              <p className="text-sm text-muted">{theme.description}</p>
            </button>
          ))}
        </div>
      </section>
      
      {/* System Health */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">System Health</h2>
          </div>
          <button
            onClick={checkHealth}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(healthStatus.services || {}).map(([service, status]) => (
            <div key={service} className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status.status)}
                <div>
                  <p className="font-medium capitalize">{service.replace('_', ' ')}</p>
                  <p className="text-sm text-muted">{status.message}</p>
                </div>
              </div>
              {status.port && (
                <span className="text-xs bg-background px-2 py-1 rounded">
                  Port {status.port}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
      
      {/* Model Management */}
      <section className="card">
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">AI Models</h2>
        </div>
        
        {/* Model Launcher */}
        <div className="bg-surface p-4 rounded-lg mb-4">
          <h3 className="font-medium mb-3">Launch Model</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Model File</label>
              <select
                value={modelConfig.modelPath}
                onChange={(e) => setModelConfig({ ...modelConfig, modelPath: e.target.value })}
                className="input w-full"
              >
                <option value="">Select a model...</option>
                {models.map((model) => (
                  <option key={model.filename} value={model.path}>
                    {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <input
                type="number"
                value={modelConfig.port}
                onChange={(e) => setModelConfig({ ...modelConfig, port: parseInt(e.target.value) })}
                className="input w-full"
                min="5000"
                max="9999"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Threads</label>
              <input
                type="number"
                value={modelConfig.threads}
                onChange={(e) => setModelConfig({ ...modelConfig, threads: parseInt(e.target.value) })}
                className="input w-full"
                min="1"
                max="16"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Context Size</label>
              <input
                type="number"
                value={modelConfig.context}
                onChange={(e) => setModelConfig({ ...modelConfig, context: parseInt(e.target.value) })}
                className="input w-full"
                min="512"
                max="8192"
                step="512"
              />
            </div>
          </div>
          
          <button
            onClick={handleLaunchModel}
            className="btn-primary flex items-center gap-2"
            disabled={!modelConfig.modelPath}
          >
            <Play className="w-4 h-4" />
            Launch Model
          </button>
        </div>
        
        {/* Active Models */}
        <div>
          <h3 className="font-medium mb-3">Active Models</h3>
          
          {modelStatus.length === 0 ? (
            <p className="text-muted text-center py-4">No models currently running</p>
          ) : (
            <div className="space-y-2">
              {modelStatus.map((status) => (
                <div key={status.port} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.status)}
                    <div>
                      <p className="font-medium">Port {status.port}</p>
                      <p className="text-sm text-muted">
                        {status.modelPath ? status.modelPath.split('/').pop() : 'Unknown model'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {status.uptime && (
                      <span className="text-xs text-muted">
                        {Math.floor(status.uptime / 1000 / 60)}m uptime
                      </span>
                    )}
                    <button
                      onClick={() => handleStopModel(status.port)}
                      className="btn-secondary flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      Stop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Editor Settings */}
      <section className="card">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Code Editor</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Autocomplete</label>
            <input
              type="checkbox"
              checked={editorSettings.autocomplete}
              onChange={(e) => setEditorSettings({ ...editorSettings, autocomplete: e.target.checked })}
              className="toggle"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Minimap</label>
            <input
              type="checkbox"
              checked={editorSettings.minimap}
              onChange={(e) => setEditorSettings({ ...editorSettings, minimap: e.target.checked })}
              className="toggle"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Word Wrap</label>
            <select
              value={editorSettings.wordWrap}
              onChange={(e) => setEditorSettings({ ...editorSettings, wordWrap: e.target.value })}
              className="input w-full"
            >
              <option value="off">Off</option>
              <option value="on">On</option>
              <option value="wordWrapColumn">Column</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Font Size</label>
            <input
              type="number"
              value={editorSettings.fontSize}
              onChange={(e) => setEditorSettings({ ...editorSettings, fontSize: parseInt(e.target.value) })}
              className="input w-full"
              min="10"
              max="24"
            />
          </div>
        </div>
      </section>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="btn-primary"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;