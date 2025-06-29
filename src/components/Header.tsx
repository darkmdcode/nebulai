import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Command } from 'lucide-react';
import { useThemeStore } from '../stores/theme';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname === '/search') return 'Search';
    if (location.pathname.startsWith('/projects/')) return 'Project Editor';
    if (location.pathname.includes('/chat')) return 'AI Chat';
    return 'AI Dashboard';
  };
  
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="font-semibold text-foreground">{getPageTitle()}</h2>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search projects, chats, files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </form>
        
        {/* Theme Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className={`w-3 h-3 rounded-full theme-indicator-${currentTheme}`} />
          <span className="capitalize">{currentTheme.replace('-', ' ')}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;