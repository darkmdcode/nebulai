import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Code,
  Loader2,
  Edit2,
  Sparkles,
  Zap,
  Bug,
  Lightbulb
} from 'lucide-react';
import { useChatStore } from '../stores/chat';
import { useProjectsStore } from '../stores/projects';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

const ChatInterface = () => {
  const navigate = useNavigate();
  const { 
    currentChat, 
    chats,
    generating,
    fetchChats, 
    createChat, 
    setCurrentChat, 
    generateResponse,
    renameChat
  } = useChatStore();
  const { currentProject, projects } = useProjectsStore();
  
  const [message, setMessage] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const initializeChat = async () => {
      if (currentProject) {
        await fetchChats(currentProject.id);
        
        // Find existing chat for this project or create new one
        const existingChat = chats.find(c => c.project_id === currentProject.id);
        
        if (existingChat) {
          setCurrentChat(existingChat);
          setNewTitle(existingChat.title);
        } else {
          // Create new chat for this project
          try {
            const chat = await createChat({
              project_id: currentProject.id,
              title: `${currentProject.name} Chat`,
              model_config: {}
            });
            setCurrentChat(chat);
            setNewTitle(chat.title);
          } catch (error) {
            console.error('Failed to create chat:', error);
          }
        }
      }
    };

    initializeChat();
  }, [currentProject, chats.length]);
  
  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentChat || generating) return;
    
    const userMessage = message.trim();
    setMessage('');
    
    try {
      await generateResponse(userMessage, currentProject?.slug);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleRenameChat = async () => {
    if (!currentChat || !newTitle.trim()) return;
    
    try {
      await renameChat(currentChat.id, newTitle);
      setEditingTitle(false);
      toast.success('Chat renamed successfully');
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  const insertCodeIntoEditor = () => {
    if (currentProject) {
      navigate(`/projects/${currentProject.slug}/editor`);
      toast.success('Opening code editor...');
    }
  };
  
  const handleSuggestedPrompt = (prompt: string) => {
    setMessage(prompt);
  };
  
  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No project selected</h2>
          <p className="text-muted">Create or select a project to start chatting</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input text-lg font-medium bg-transparent border-none p-0 focus:ring-0"
                onBlur={handleRenameChat}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameChat();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">
                {currentChat?.title || `${currentProject.name} Chat`}
              </h2>
              <button
                onClick={() => setEditingTitle(true)}
                className="p-1 hover:bg-background rounded transition-colors"
                title="Rename Chat"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <span className="text-sm text-muted bg-accent/10 px-2 py-1 rounded">
            {currentProject.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={insertCodeIntoEditor}
            className="btn-secondary flex items-center gap-1"
            title="Open Code Editor"
          >
            <Code className="w-4 h-4" />
            Editor
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!currentChat || currentChat.messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Welcome to NebulAI</h3>
            <p className="text-muted mb-8 max-w-md mx-auto">
              Start building with AI assistance. Ask questions, generate code, or get help with your {currentProject.name} project.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => handleSuggestedPrompt('Build a responsive navigation component with React and Tailwind CSS')}
                className="p-4 text-left bg-surface hover:bg-accent/10 border border-border rounded-lg transition-all hover:border-accent group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h4 className="font-medium">Build Components</h4>
                </div>
                <p className="text-sm text-muted group-hover:text-foreground">
                  Create reusable UI components with modern frameworks
                </p>
              </button>
              
              <button
                onClick={() => handleSuggestedPrompt('Review my code and suggest improvements for better performance')}
                className="p-4 text-left bg-surface hover:bg-accent/10 border border-border rounded-lg transition-all hover:border-accent group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-warning" />
                  <h4 className="font-medium">Optimize Code</h4>
                </div>
                <p className="text-sm text-muted group-hover:text-foreground">
                  Get suggestions for performance and best practices
                </p>
              </button>
              
              <button
                onClick={() => handleSuggestedPrompt('Explain how to implement user authentication with JWT tokens')}
                className="p-4 text-left bg-surface hover:bg-accent/10 border border-border rounded-lg transition-all hover:border-accent group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Lightbulb className="w-5 h-5 text-success" />
                  <h4 className="font-medium">Learn Concepts</h4>
                </div>
                <p className="text-sm text-muted group-hover:text-foreground">
                  Understand complex programming concepts and patterns
                </p>
              </button>
              
              <button
                onClick={() => handleSuggestedPrompt('Debug this error: Cannot read property of undefined')}
                className="p-4 text-left bg-surface hover:bg-accent/10 border border-border rounded-lg transition-all hover:border-accent group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Bug className="w-5 h-5 text-error" />
                  <h4 className="font-medium">Debug Issues</h4>
                </div>
                <p className="text-sm text-muted group-hover:text-foreground">
                  Fix bugs and troubleshoot common problems
                </p>
              </button>
            </div>
          </div>
        ) : (
          currentChat.messages.map((msg, index) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-3xl ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`p-4 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-accent text-white ml-auto' 
                    : 'bg-surface border border-border'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                  <span>{format(new Date(msg.timestamp), 'h:mm a')}</span>
                  
                  {msg.role === 'assistant' && (
                    <>
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        className="hover:text-foreground transition-colors"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={insertCodeIntoEditor}
                        className="hover:text-foreground transition-colors"
                        title="Open code editor"
                      >
                        <Code className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {generating && (
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-muted">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="border-t border-border p-6">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask about ${currentProject.name} or request code assistance...`}
              className="input w-full min-h-[3rem] max-h-32 resize-none pr-12"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={generating}
              autoFocus
            />
            
            <button
              type="submit"
              disabled={!message.trim() || generating}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-accent hover:text-accent/80 disabled:text-muted disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Project: {currentProject.name}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;