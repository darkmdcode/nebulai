import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Settings, 
  Plus,
  Bot,
  Sparkles,
  FolderOpen,
  MessageSquare,
  Code,
  Edit2,
  ChevronDown,
  ChevronRight,
  Palette
} from 'lucide-react';
import { useProjectsStore } from '../stores/projects';
import { useChatStore } from '../stores/chat';
import { useModelsStore } from '../stores/models';
import { useThemeStore } from '../stores/theme';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    projects, 
    currentProject, 
    createProject, 
    setCurrentProject 
  } = useProjectsStore();
  const { chats } = useChatStore();
  const { modelStatus } = useModelsStore();
  const { currentTheme, setTheme, themes } = useThemeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  
  const activeModels = modelStatus.filter(m => m.status === 'active').length;
  
  const generateProjectName = () => {
    const adjectives = [
      'Neon', 'Echo', 'Lunar', 'Pixel', 'Star', 'Dream', 'Nova', 
      'Cyber', 'Quantum', 'Cosmic', 'Digital', 'Neural', 'Plasma'
    ];
    const nouns = [
      'Tool', 'Agent', 'Builder', 'Zone', 'Studio', 'Project', 
      'Lab', 'Hub', 'Space', 'Forge', 'Engine', 'Core'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective} ${noun}`;
  };
  
  const handleNewProject = async () => {
    try {
      const project = await createProject({
        name: generateProjectName(),
        description: 'AI-powered project'
      });
      setCurrentProject(project);
      navigate('/chat');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };
  
  const handleProjectSelect = (project: any) => {
    setCurrentProject(project);
    navigate('/chat');
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const cycleTheme = () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setTheme(themeKeys[nextIndex] as any);
  };
  
  return (
    <div className="w-80 bg-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">NebulAI</h1>
            <div className="flex items-center gap-1 text-xs text-muted">
              <div className={`w-2 h-2 rounded-full ${activeModels > 0 ? 'bg-success' : 'bg-muted'}`} />
              <span>{activeModels} models active</span>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search projects, chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
          />
        </form>
      </div>
      
      {/* Current Project */}
      {currentProject && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Current Project</h3>
            <Link
              to={`/projects/${currentProject.slug}/editor`}
              className="p-1 hover:bg-surface rounded transition-colors"
              title="Open Editor"
            >
              <Code className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <span className="font-medium truncate">{currentProject.name}</span>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Projects Section */}
        <div>
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center justify-between w-full mb-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            <span>Projects</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewProject();
                }}
                className="p-1 hover:bg-surface rounded transition-colors"
                title="New Project"
              >
                <Plus className="w-3 h-3" />
              </button>
              {projectsExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
          </button>
          
          {projectsExpanded && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {projects.slice(0, 10).map((project) => (
                <button
                  key={project.slug}
                  onClick={() => handleProjectSelect(project)}
                  className={`w-full flex items-center gap-2 p-2 text-left hover:bg-surface rounded transition-colors text-sm ${
                    currentProject?.slug === project.slug ? 'bg-accent text-white' : ''
                  }`}
                >
                  <FolderOpen className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
              
              {projects.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted mb-2">No projects yet</p>
                  <button
                    onClick={handleNewProject}
                    className="btn-primary text-xs"
                  >
                    Create First Project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Recent Chats Section */}
        <div>
          <button
            onClick={() => setChatsExpanded(!chatsExpanded)}
            className="flex items-center justify-between w-full mb-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            <span>Recent Chats</span>
            {chatsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
          
          {chatsExpanded && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {chats.slice(0, 5).map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => navigate('/chat')}
                  className="w-full flex items-center gap-2 p-2 text-left hover:bg-surface rounded transition-colors text-sm"
                >
                  <MessageSquare className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
              
              {chats.length === 0 && (
                <p className="text-xs text-muted text-center py-2">No chats yet</p>
              )}
            </div>
          )}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="w-full flex items-center gap-2 p-2 hover:bg-surface rounded transition-colors text-sm"
          title="Cycle Theme"
        >
          <Palette className="w-4 h-4" />
          <span className="capitalize">{currentTheme.replace('-', ' ')}</span>
          <div className={`w-3 h-3 rounded-full ml-auto theme-indicator-${currentTheme}`} />
        </button>
        
        {/* Settings */}
        <Link
          to="/settings"
          className={`w-full flex items-center gap-2 p-2 hover:bg-surface rounded transition-colors text-sm ${
            location.pathname === '/settings' ? 'bg-accent text-white' : ''
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        
        {/* Version */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="w-3 h-3" />
          <span>NebulAI v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;