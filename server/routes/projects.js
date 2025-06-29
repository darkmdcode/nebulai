import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/init.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectsDir = path.join(__dirname, '../../projects');

// Get all projects
router.get('/', async (req, res) => {
  try {
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM projects ORDER BY updated_at DESC');
      client.release();
      return res.json(result.rows);
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const projects = [];
    const projectDirs = await fs.readdir(projectsDir);
    
    for (const dir of projectDirs) {
      const projectPath = path.join(projectsDir, dir);
      const configPath = path.join(projectPath, 'project.json');
      
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJSON(configPath);
        projects.push({
          slug: dir,
          ...config,
          id: config.id || Date.now()
        });
      }
    }
    
    res.json(projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const projectData = {
      slug,
      name,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {},
      status: 'active'
    };
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query(`
        INSERT INTO projects (slug, name, description, created_at, updated_at, config, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [slug, name, description, projectData.created_at, projectData.updated_at, 
          JSON.stringify(projectData.config), projectData.status]);
      
      client.release();
      projectData.id = result.rows[0].id;
    } catch (dbError) {
      console.log('Database unavailable, using file system');
      projectData.id = Date.now();
    }
    
    // Create project directory structure
    const projectPath = path.join(projectsDir, slug);
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.ensureDir(path.join(projectPath, 'uploads'));
    
    // Create project config file
    await fs.writeJSON(path.join(projectPath, 'project.json'), projectData, { spaces: 2 });
    
    // Create default files
    await fs.writeFile(path.join(projectPath, 'src', 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
</head>
<body>
    <h1>Welcome to ${name}</h1>
    <p>${description}</p>
</body>
</html>`);
    
    // Create secrets file
    const secretsPath = path.join(projectPath, 'secrets.json');
    await fs.writeJSON(secretsPath, {}, { spaces: 2 });
    
    res.status(201).json(projectData);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get specific project
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM projects WHERE slug = $1', [slug]);
      client.release();
      
      if (result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const projectPath = path.join(projectsDir, slug);
    const configPath = path.join(projectPath, 'project.json');
    
    if (!await fs.pathExists(configPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const config = await fs.readJSON(configPath);
    res.json({ slug, ...config });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update project
router.put('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query(`
        UPDATE projects 
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            config = COALESCE($4, config),
            updated_at = $5
        WHERE slug = $1
        RETURNING *
      `, [
        slug, 
        updates.name, 
        updates.description, 
        updates.config ? JSON.stringify(updates.config) : null,
        new Date().toISOString()
      ]);
      
      client.release();
      
      if (result.rows.length > 0) {
        // Also update file system
        const projectPath = path.join(projectsDir, slug);
        const configPath = path.join(projectPath, 'project.json');
        
        if (await fs.pathExists(configPath)) {
          const existingConfig = await fs.readJSON(configPath);
          const updatedConfig = { ...existingConfig, ...updates, updated_at: new Date().toISOString() };
          await fs.writeJSON(configPath, updatedConfig, { spaces: 2 });
        }
        
        return res.json(result.rows[0]);
      }
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const projectPath = path.join(projectsDir, slug);
    const configPath = path.join(projectPath, 'project.json');
    
    if (!await fs.pathExists(configPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const existingConfig = await fs.readJSON(configPath);
    const updatedConfig = { 
      ...existingConfig, 
      ...updates, 
      updated_at: new Date().toISOString() 
    };
    
    await fs.writeJSON(configPath, updatedConfig, { spaces: 2 });
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Try database first
    try {
      const client = await pool.connect();
      await client.query('DELETE FROM projects WHERE slug = $1', [slug]);
      client.release();
    } catch (dbError) {
      console.log('Database unavailable, using file system only');
    }
    
    // Remove from file system
    const projectPath = path.join(projectsDir, slug);
    if (await fs.pathExists(projectPath)) {
      await fs.remove(projectPath);
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get project files
router.get('/:slug/files', async (req, res) => {
  try {
    const { slug } = req.params;
    const projectPath = path.join(projectsDir, slug);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const getFiles = async (dir, relativePath = '') => {
      const files = [];
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory() && !['node_modules', '.git'].includes(item)) {
          const subFiles = await getFiles(fullPath, itemRelativePath);
          files.push({
            name: item,
            path: itemRelativePath,
            type: 'directory',
            children: subFiles
          });
        } else if (stats.isFile() && !item.startsWith('.') && item !== 'project.json') {
          files.push({
            name: item,
            path: itemRelativePath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      return files;
    };
    
    const files = await getFiles(path.join(projectPath, 'src'));
    res.json(files);
  } catch (error) {
    console.error('Error fetching project files:', error);
    res.status(500).json({ error: 'Failed to fetch project files' });
  }
});

// Get file content
router.get('/:slug/files/*', async (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = req.params[0];
    
    const fullPath = path.join(projectsDir, slug, 'src', filePath);
    
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content, path: filePath });
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});

// Save file content
router.put('/:slug/files/*', async (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;
    
    const fullPath = path.join(projectsDir, slug, 'src', filePath);
    await fs.ensureFile(fullPath);
    await fs.writeFile(fullPath, content || '', 'utf8');
    
    // Update project timestamp
    const projectPath = path.join(projectsDir, slug);
    const configPath = path.join(projectPath, 'project.json');
    
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      config.updated_at = new Date().toISOString();
      await fs.writeJSON(configPath, config, { spaces: 2 });
    }
    
    res.json({ message: 'File saved successfully' });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

export default router;