import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { project_slug } = req.body;
    let uploadPath = uploadsDir;
    
    if (project_slug) {
      uploadPath = path.join(__dirname, '../../projects', project_slug, 'uploads');
    }
    
    await fs.ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp prefix to avoid conflicts
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    const allowedExtensions = [
      '.txt', '.md', '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
      '.json', '.xml', '.yml', '.yaml', '.py', '.php', '.rb', '.go',
      '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift',
      '.sql', '.sh', '.bash', '.env', '.dockerfile', '.jpg', '.jpeg',
      '.png', '.gif', '.webp', '.svg', '.pdf', '.zip'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
    }
  }
});

// Upload files
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const { project_slug } = req.body;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const fileInfo = {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        relativePath: project_slug 
          ? path.relative(path.join(__dirname, '../../projects', project_slug), file.path)
          : path.relative(uploadsDir, file.path),
        uploadedAt: new Date().toISOString(),
        project_slug: project_slug || null
      };
      
      uploadedFiles.push(fileInfo);
    }
    
    // Save upload metadata
    const metadataPath = project_slug 
      ? path.join(__dirname, '../../projects', project_slug, 'uploads', 'metadata.json')
      : path.join(uploadsDir, 'metadata.json');
    
    let metadata = [];
    if (await fs.pathExists(metadataPath)) {
      metadata = await fs.readJSON(metadataPath);
    }
    
    metadata.push(...uploadedFiles);
    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
    
    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Get uploaded files
router.get('/', async (req, res) => {
  try {
    const { project_slug } = req.query;
    
    const metadataPath = project_slug 
      ? path.join(__dirname, '../../projects', project_slug, 'uploads', 'metadata.json')
      : path.join(uploadsDir, 'metadata.json');
    
    let files = [];
    if (await fs.pathExists(metadataPath)) {
      files = await fs.readJSON(metadataPath);
    }
    
    // Filter by project if specified
    if (project_slug) {
      files = files.filter(file => file.project_slug === project_slug);
    }
    
    res.json(files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ error: 'Failed to fetch uploaded files' });
  }
});

// Get file content
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { project_slug } = req.query;
    
    let filePath;
    if (project_slug) {
      filePath = path.join(__dirname, '../../projects', project_slug, 'uploads', filename);
    } else {
      filePath = path.join(uploadsDir, filename);
    }
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Determine if file should be served as text or binary
    const textExtensions = [
      '.txt', '.md', '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
      '.json', '.xml', '.yml', '.yaml', '.py', '.php', '.rb', '.go',
      '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift',
      '.sql', '.sh', '.bash', '.env', '.dockerfile'
    ];
    
    if (textExtensions.includes(ext)) {
      const content = await fs.readFile(filePath, 'utf8');
      res.json({
        filename,
        content,
        size: stats.size,
        type: 'text',
        modified: stats.mtime
      });
    } else {
      // Serve binary files directly
      res.sendFile(filePath);
    }
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Delete uploaded file
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { project_slug } = req.query;
    
    let filePath, metadataPath;
    
    if (project_slug) {
      filePath = path.join(__dirname, '../../projects', project_slug, 'uploads', filename);
      metadataPath = path.join(__dirname, '../../projects', project_slug, 'uploads', 'metadata.json');
    } else {
      filePath = path.join(uploadsDir, filename);
      metadataPath = path.join(uploadsDir, 'metadata.json');
    }
    
    // Remove file
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
    
    // Update metadata
    if (await fs.pathExists(metadataPath)) {
      let metadata = await fs.readJSON(metadataPath);
      metadata = metadata.filter(file => file.filename !== filename);
      await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;