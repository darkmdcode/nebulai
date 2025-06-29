import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { 
  FileText, 
  Folder, 
  Plus, 
  Save, 
  Play, 
  Eye,
  MessageSquare,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { useProjectsStore } from '../stores/projects';
import MonacoEditor from '@monaco-editor/react';
import toast from 'react-hot-toast';

const ProjectEditor = () => {
  const { slug } = useParams<{ slug: string }>();
  const { 
    currentProject, 
    currentFiles, 
    currentFileContent, 
    currentFilePath,
    fetchFiles, 
    fetchFileContent, 
    saveFileContent,
    setCurrentFileContent 
  } = useProjectsStore();
  
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  
  useEffect(() => {
    if (slug) {
      fetchFiles(slug);
    }
  }, [slug]);
  
  useEffect(() => {
    if (currentFiles.length > 0 && !selectedFile) {
      // Auto-select index.html if it exists, otherwise select first file
      const indexFile = currentFiles.find(f => f.name === 'index.html');
      const firstFile = currentFiles.find(f => f.type === 'file');
      
      if (indexFile) {
        handleFileSelect(indexFile.path);
      } else if (firstFile) {
        handleFileSelect(firstFile.path);
      }
    }
  }, [currentFiles]);
  
  const handleFileSelect = async (filePath: string) => {
    if (unsavedChanges) {
      const shouldContinue = window.confirm('You have unsaved changes. Continue without saving?');
      if (!shouldContinue) return;
    }
    
    setSelectedFile(filePath);
    if (slug) {
      await fetchFileContent(slug, filePath);
      setUnsavedChanges(false);
    }
  };
  
  const handleContentChange = (value: string | undefined) => {
    setCurrentFileContent(value || '');
    setUnsavedChanges(true);
  };
  
  const handleSave = async () => {
    if (!slug || !selectedFile) return;
    
    try {
      await saveFileContent(slug, selectedFile, currentFileContent);
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };
  
  const handleCreateFile = async () => {
    if (!slug || !newFileName.trim()) return;
    
    try {
      await saveFileContent(slug, newFileName, '');
      await fetchFiles(slug);
      setNewFileName('');
      setShowNewFileDialog(false);
      handleFileSelect(newFileName);
      toast.success('File created successfully');
    } catch (error) {
      console.error('Failed to create file:', error);
      toast.error('Failed to create file');
    }
  };
  
  const getFileIcon = (fileName: string, type: string) => {
    if (type === 'directory') return <Folder className="w-4 h-4 text-accent" />;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'css':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileText className="w-4 h-4 text-yellow-500" />;
      case 'json':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'md':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-muted" />;
    }
  };
  
  const getLanguageFromFileName = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'php':
        return 'php';
      case 'rb':
        return 'ruby';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'sql':
        return 'sql';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };
  
  const renderFileTree = (files: any[], level = 0) => {
    return files.map((file) => (
      <div key={file.path} style={{ marginLeft: `${level * 1}rem` }}>
        <button
          onClick={() => file.type === 'file' && handleFileSelect(file.path)}
          className={`w-full flex items-center gap-2 p-2 text-left hover:bg-surface rounded transition-colors ${
            selectedFile === file.path ? 'bg-accent text-white' : ''
          }`}
        >
          {getFileIcon(file.name, file.type)}
          <span className="text-sm truncate">{file.name}</span>
          {file.type === 'file' && selectedFile === file.path && unsavedChanges && (
            <div className="w-2 h-2 bg-warning rounded-full ml-auto" />
          )}
        </button>
        
        {file.children && file.children.length > 0 && (
          <div className="ml-4">
            {renderFileTree(file.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };
  
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted">The requested project could not be loaded.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h3 className="font-medium">{currentProject.name}</h3>
          {selectedFile && (
            <span className="text-sm text-muted">
              {selectedFile}
              {unsavedChanges && <span className="text-warning ml-1">•</span>}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFileDialog(true)}
            className="btn-secondary flex items-center gap-1"
            title="New File"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          
          <button
            onClick={handleSave}
            disabled={!selectedFile || !unsavedChanges}
            className="btn-primary flex items-center gap-1"
            title="Save File"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`btn-secondary flex items-center gap-1 ${showPreview ? 'bg-accent text-white' : ''}`}
            title="Toggle Preview"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* File Explorer */}
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full bg-sidebar border-r border-border">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Files</h4>
                  <button
                    onClick={() => slug && fetchFiles(slug)}
                    className="p-1 hover:bg-surface rounded transition-colors"
                    title="Refresh Files"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div className="p-2 overflow-y-auto">
                {currentFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">No files found</p>
                    <button
                      onClick={() => setShowNewFileDialog(true)}
                      className="btn-primary mt-2 text-xs"
                    >
                      Create File
                    </button>
                  </div>
                ) : (
                  renderFileTree(currentFiles)
                )}
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
          
          {/* Editor */}
          <Panel defaultSize={showPreview ? 50 : 80}>
            <div className="h-full bg-background">
              {selectedFile ? (
                <MonacoEditor
                  height="100%"
                  language={getLanguageFromFileName(selectedFile)}
                  value={currentFileContent}
                  onChange={handleContentChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    suggest: { enabled: true },
                    quickSuggestions: true,
                    parameterHints: { enabled: true },
                    formatOnPaste: true,
                    formatOnType: true
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No file selected</h3>
                    <p className="text-muted">Select a file from the explorer to start editing</p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
          
          {/* Preview Panel */}
          {showPreview && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
              <Panel defaultSize={30} minSize={20}>
                <div className="h-full bg-surface border-l border-border">
                  <div className="p-3 border-b border-border">
                    <h4 className="font-medium text-sm">Preview</h4>
                  </div>
                  
                  <div className="p-4 overflow-y-auto">
                    {selectedFile?.endsWith('.html') ? (
                      <iframe
                        srcDoc={currentFileContent}
                        className="w-full h-96 border border-border rounded"
                        title="Preview"
                      />
                    ) : selectedFile?.endsWith('.md') ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">
                          {currentFileContent}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Eye className="w-8 h-8 text-muted mx-auto mb-2" />
                        <p className="text-sm text-muted">
                          Preview not available for this file type
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      
      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New File</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">File Name</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="input w-full"
                  placeholder="example.html"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewFileDialog(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFile}
                  disabled={!newFileName.trim()}
                  className="btn-primary flex-1"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectEditor;