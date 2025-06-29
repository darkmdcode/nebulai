import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderOpen, 
  MessageSquare, 
  Plus, 
  Download,
  Trash2,
  Edit2,
  Calendar,
  Activity
} from 'lucide-react';
import { useProjectsStore } from '../stores/projects';
import { useChatStore } from '../stores/chat';
import { useModelsStore } from '../stores/models';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { projects, fetchProjects, createProject, deleteProject } = useProjectsStore();
  const { chats, fetchChats } = useChatStore();
  const { healthStatus, checkHealth } = useModelsStore();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: '', description: '' });
  
  useEffect(() => {
    fetchProjects();
    fetchChats();
    checkHealth();
  }, []);
  
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject(newProjectData);
      setNewProjectData({ name: '', description: '' });
      setShowCreateProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };
  
  const handleDeleteProject = async (slug: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await deleteProject(slug);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };
  
  const handleExportProject = async (slug: string, name: string) => {
    try {
      const response = await fetch(`/api/export?project_slug=${slug}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_export_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Project exported successfully');
    } catch (error) {
      console.error('Failed to export project:', error);
      toast.error('Failed to export project');
    }
  };
  
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      default: return 'text-muted';
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Dashboard</h1>
          <p className="text-muted">Manage your AI-powered projects and conversations</p>
        </div>
        
        <button
          onClick={() => setShowCreateProject(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
      
      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getHealthStatusColor(healthStatus.status)}`} />
            <div>
              <p className="text-sm text-muted">System Status</p>
              <p className="font-medium capitalize">{healthStatus.status || 'Unknown'}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm text-muted">Active Models</p>
              <p className="font-medium">
                {Object.values(healthStatus.services || {}).filter(s => s.status === 'ok' && s.port).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm text-muted">Projects</p>
              <p className="font-medium">{projects.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm text-muted">Chats</p>
              <p className="font-medium">{chats.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>
        
        {projects.length === 0 ? (
          <div className="card text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted mb-4">Create your first AI project to get started</p>
            <button
              onClick={() => setShowCreateProject(true)}
              className="btn-primary"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.slug} className="card group hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      to={`/projects/${project.slug}`}
                      className="text-lg font-medium hover:text-accent transition-colors"
                    >
                      {project.name}
                    </Link>
                    <p className="text-sm text-muted mt-1 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleExportProject(project.slug, project.name)}
                      className="p-1 hover:bg-surface rounded transition-colors"
                      title="Export Project"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.slug, project.name)}
                      className="p-1 hover:bg-surface rounded transition-colors text-error"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(project.updated_at), 'MMM d, yyyy')}</span>
                  </div>
                  <span className="px-2 py-1 bg-surface rounded text-xs">
                    {project.status}
                  </span>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/projects/${project.slug}`}
                    className="btn-secondary flex-1 text-center"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Link>
                  <Link
                    to={`/projects/${project.slug}/chat`}
                    className="btn-primary flex-1 text-center"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Chats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
        
        {chats.length === 0 ? (
          <div className="card text-center py-8">
            <MessageSquare className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-muted">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.slice(0, 5).map((chat) => (
              <Link
                key={chat.id}
                to={`/chats/${chat.id}`}
                className="block card hover:bg-surface transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    <div>
                      <p className="font-medium">{chat.title}</p>
                      <p className="text-sm text-muted">
                        {chat.messages.length} messages • {format(new Date(chat.updated_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted">
                    {chat.project_id && (
                      <span className="px-2 py-1 bg-accent/10 text-accent rounded">
                        Project Chat
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  className="input w-full"
                  placeholder="My AI Project"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Describe your project..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;