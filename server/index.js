import { config } from 'dotenv';
config();
console.log('🧪 Loaded env password:', process.env.DB_PASSWORD);
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

// Import routes
import projectRoutes from './routes/projects.js';
import chatRoutes from './routes/chats.js';
import searchRoutes from './routes/search.js';
import uploadRoutes from './routes/upload.js';
import exportRoutes from './routes/export.js';
import modelRoutes from './routes/models.js';
import secretRoutes from './routes/secrets.js';
import settingRoutes from './routes/settings.js';
import healthRoutes from './routes/health.js';
import { initializeDatabase } from './database/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure required directories exist
const ensureDirectories = async () => {
  const dirs = [
    'projects',
    'chats',
    'uploads',
    'snapshots',
    'secrets',
    'models'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(__dirname, '..', dir));
  }
};

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/secrets', secretRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/health', healthRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Initialize and start server
const startServer = async () => {
  try {
    await ensureDirectories();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 AI Dashboard Platform running on port ${PORT}`);
      console.log(`📁 Projects directory: ${path.join(__dirname, '..', 'projects')}`);
      console.log(`🤖 AI Port: ${process.env.AI_PORT || 5001}`);
      console.log(`🔍 Secondary AI Port: ${process.env.SECONDARY_AI_PORT || 5002}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();