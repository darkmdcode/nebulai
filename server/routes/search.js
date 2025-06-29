import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectsDir = path.join(__dirname, '../../projects');
const chatsDir = path.join(__dirname, '../../chats');

// Universal search
router.get('/', async (req, res) => {
  try {
    const { q: query, type, project_slug } = req.query;
    
    if (!query) {
      return res.json({ results: [] });
    }
    
    const results = [];
    const searchTerm = query.toLowerCase();
    
    // Search projects
    if (!type || type === 'projects') {
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const dir of projectDirs) {
        if (project_slug && dir !== project_slug) continue;
        
        const projectPath = path.join(projectsDir, dir);
        const configPath = path.join(projectPath, 'project.json');
        
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJSON(configPath);
          
          if (config.name?.toLowerCase().includes(searchTerm) ||
              config.description?.toLowerCase().includes(searchTerm)) {
            results.push({
              type: 'project',
              id: config.slug || dir,
              title: config.name,
              description: config.description,
              path: `/projects/${config.slug || dir}`,
              match: config.name?.toLowerCase().includes(searchTerm) ? 'name' : 'description'
            });
          }
        }
      }
    }
    
    // Search chat messages
    if (!type || type === 'chats') {
      const chatFiles = await fs.readdir(chatsDir);
      
      for (const file of chatFiles) {
        if (file.endsWith('.json')) {
          const chatPath = path.join(chatsDir, file);
          const chat = await fs.readJSON(chatPath);
          
          if (project_slug && chat.project_id != project_slug) continue;
          
          // Search in chat title
          if (chat.title?.toLowerCase().includes(searchTerm)) {
            results.push({
              type: 'chat',
              id: chat.id,
              title: chat.title,
              description: `Chat from ${new Date(chat.created_at).toLocaleDateString()}`,
              path: `/chats/${chat.id}`,
              match: 'title'
            });
          }
          
          // Search in messages
          if (chat.messages && Array.isArray(chat.messages)) {
            for (let i = 0; i < chat.messages.length; i++) {
              const message = chat.messages[i];
              if (message.content?.toLowerCase().includes(searchTerm)) {
                results.push({
                  type: 'message',
                  id: `${chat.id}-${i}`,
                  title: `Message in "${chat.title}"`,
                  description: message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''),
                  path: `/chats/${chat.id}?message=${i}`,
                  match: 'content',
                  messageIndex: i
                });
              }
            }
          }
        }
      }
    }
    
    // Search project files
    if (!type || type === 'files') {
      const searchInFiles = async (dir, projectSlug, relativePath = '') => {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const itemRelativePath = path.join(relativePath, item);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory() && !['node_modules', '.git', 'uploads'].includes(item)) {
            await searchInFiles(fullPath, projectSlug, itemRelativePath);
          } else if (stats.isFile() && !item.startsWith('.') && item !== 'project.json') {
            // Search filename
            if (item.toLowerCase().includes(searchTerm)) {
              results.push({
                type: 'file',
                id: `${projectSlug}-${itemRelativePath}`,
                title: item,
                description: `File in ${projectSlug}`,
                path: `/projects/${projectSlug}/files/${itemRelativePath}`,
                match: 'filename'
              });
            }
            
            // Search file content (only for text files)
            if (isTextFile(item)) {
              try {
                const content = await fs.readFile(fullPath, 'utf8');
                if (content.toLowerCase().includes(searchTerm)) {
                  // Find the line with the match
                  const lines = content.split('\n');
                  const matchingLines = lines
                    .map((line, index) => ({ line, index: index + 1 }))
                    .filter(({ line }) => line.toLowerCase().includes(searchTerm))
                    .slice(0, 3); // Max 3 matches per file
                  
                  for (const { line, index } of matchingLines) {
                    results.push({
                      type: 'file-content',
                      id: `${projectSlug}-${itemRelativePath}-${index}`,
                      title: `${item}:${index}`,
                      description: line.trim().substring(0, 200),
                      path: `/projects/${projectSlug}/files/${itemRelativePath}?line=${index}`,
                      match: 'content',
                      lineNumber: index
                    });
                  }
                }
              } catch (error) {
                // Skip files that can't be read
              }
            }
          }
        }
      };
      
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const dir of projectDirs) {
        if (project_slug && dir !== project_slug) continue;
        
        const srcPath = path.join(projectsDir, dir, 'src');
        if (await fs.pathExists(srcPath)) {
          await searchInFiles(srcPath, dir);
        }
      }
    }
    
    // Sort results by relevance
    results.sort((a, b) => {
      // Exact matches first
      const aExact = a.title?.toLowerCase() === searchTerm;
      const bExact = b.title?.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then by type priority
      const typePriority = { project: 0, chat: 1, file: 2, message: 3, 'file-content': 4 };
      return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
    });
    
    res.json({
      query,
      results: results.slice(0, 50), // Limit to 50 results
      total: results.length
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Helper function to determine if a file is likely to be text
const isTextFile = (filename) => {
  const textExtensions = [
    '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss',
    '.json', '.xml', '.yml', '.yaml', '.py', '.php', '.rb', '.go', '.rs',
    '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift', '.sql', '.sh',
    '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.dockerfile', '.env'
  ];
  
  const ext = path.extname(filename).toLowerCase();
  return textExtensions.includes(ext) || !ext; // Include files without extension
};

export default router;