import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  FileText, 
  MessageSquare, 
  FolderOpen,
  Code,
  Hash,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface SearchResult {
  type: 'project' | 'chat' | 'file' | 'message' | 'file-content';
  id: string;
  title: string;
  description: string;
  path: string;
  match: string;
  lineNumber?: number;
  messageIndex?: number;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  
  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query]);
  
  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      setResults(data.results || []);
      setTotalResults(data.total || 0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };
  
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="w-5 h-5 text-accent" />;
      case 'chat':
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'file':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'file-content':
        return <Code className="w-5 h-5 text-purple-500" />;
      default:
        return <Search className="w-5 h-5 text-muted" />;
    }
  };
  
  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Project';
      case 'chat':
        return 'Chat';
      case 'message':
        return 'Message';
      case 'file':
        return 'File';
      case 'file-content':
        return 'Code';
      default:
        return 'Result';
    }
  };
  
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-accent/20 text-accent px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };
  
  if (!query.trim()) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Search className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Universal Search</h2>
          <p className="text-muted mb-6">
            Search across projects, chats, files, and code content
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-accent" />
                Projects
              </h3>
              <p className="text-sm text-muted">Find projects by name or description</p>
            </div>
            
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Conversations
              </h3>
              <p className="text-sm text-muted">Search chat titles and messages</p>
            </div>
            
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                Files
              </h3>
              <p className="text-sm text-muted">Locate files by name or path</p>
            </div>
            
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-500" />
                Code Content
              </h3>
              <p className="text-sm text-muted">Search inside code files</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Search Results</h1>
          <div className="flex items-center gap-4 text-muted">
            <span>Query: "{query}"</span>
            {!loading && (
              <span>{totalResults} results found</span>
            )}
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted">Searching...</p>
          </div>
        )}
        
        {/* No Results */}
        {!loading && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted">
              Try different keywords or check your spelling
            </p>
          </div>
        )}
        
        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.id} className="card hover:shadow-lg transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                        {getResultTypeLabel(result.type)}
                      </span>
                      
                      {result.lineNumber && (
                        <span className="text-xs bg-surface px-2 py-1 rounded flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          Line {result.lineNumber}
                        </span>
                      )}
                      
                      {result.messageIndex !== undefined && (
                        <span className="text-xs bg-surface px-2 py-1 rounded">
                          Message #{result.messageIndex + 1}
                        </span>
                      )}
                    </div>
                    
                    <Link
                      to={result.path}
                      className="block group"
                    >
                      <h3 className="font-medium text-lg mb-2 group-hover:text-accent transition-colors flex items-center gap-2">
                        {highlightText(result.title, query)}
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      
                      <p className="text-muted text-sm line-clamp-2 mb-2">
                        {highlightText(result.description, query)}
                      </p>
                    </Link>
                    
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>Match in: {result.match}</span>
                      <span className="font-mono bg-surface px-2 py-1 rounded">
                        {result.path}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Search Tips */}
        {!loading && results.length > 0 && (
          <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
            <h4 className="font-medium mb-2">Search Tips</h4>
            <ul className="text-sm text-muted space-y-1">
              <li>• Use quotes for exact phrases: "exact match"</li>
              <li>• Search is case-insensitive</li>
              <li>• Results are ranked by relevance</li>
              <li>• File content search works with text files only</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;