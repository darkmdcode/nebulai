import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './stores/theme';
import { useProjectsStore } from './stores/projects';
import ChatInterface from './pages/ChatInterface';
import ProjectEditor from './pages/ProjectEditor';
import Settings from './pages/Settings';
import SearchResults from './pages/SearchResults';
import Sidebar from './components/Sidebar';
import './styles/themes.css';

function App() {
  const { currentTheme } = useThemeStore();
  const { projects, fetchProjects, createProject, setCurrentProject } = useProjectsStore();

  useEffect(() => {
    const initializeApp = async () => {
      await fetchProjects();
      
      // Auto-create a project if none exist
      if (projects.length === 0) {
        try {
          const newProject = await createProject({
            name: generateProjectName(),
            description: 'AI-powered project'
          });
          setCurrentProject(newProject);
        } catch (error) {
          console.error('Failed to create initial project:', error);
        }
      } else {
        // Set the most recently updated project as current
        const mostRecent = projects.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
        setCurrentProject(mostRecent);
      }
    };

    initializeApp();
  }, []);

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

  return (
    <div className={`app ${currentTheme}`} data-theme={currentTheme}>
      <Router>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="/chat" element={<ChatInterface />} />
                <Route path="/projects/:slug" element={<Navigate to="/chat" replace />} />
                <Route path="/projects/:slug/editor" element={<ProjectEditor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/search" element={<SearchResults />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            className: 'toast',
            duration: 4000,
          }}
        />
      </Router>
    </div>
  );
}

export default App;