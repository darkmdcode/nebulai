import express from 'express';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectsDir = path.join(__dirname, '../../projects');
const chatsDir = path.join(__dirname, '../../chats');

// Export project as ZIP
router.get('/', async (req, res) => {
  try {
    const { project_slug, include_chats = 'true' } = req.query;
    
    if (!project_slug) {
      return res.status(400).json({ error: 'Project slug is required' });
    }
    
    const projectPath = path.join(projectsDir, project_slug);
    
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Read project config
    const configPath = path.join(projectPath, 'project.json');
    const config = await fs.readJSON(configPath);
    
    // Set response headers for download
    const exportName = `${config.name || project_slug}_export_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${exportName}"`);
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Best compression
    });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });
    
    archive.pipe(res);
    
    // Add README
    const readmeContent = generateREADME(config, project_slug);
    archive.append(readmeContent, { name: 'README.md' });
    
    // Add project files
    archive.directory(path.join(projectPath, 'src'), 'src');
    
    // Add uploads if they exist
    const uploadsPath = path.join(projectPath, 'uploads');
    if (await fs.pathExists(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }
    
    // Add project config (without sensitive data)
    const exportConfig = {
      ...config,
      exported_at: new Date().toISOString(),
      export_version: '1.0'
    };
    delete exportConfig.secrets; // Remove any secrets
    archive.append(JSON.stringify(exportConfig, null, 2), { name: 'project.json' });
    
    // Add chats if requested
    if (include_chats === 'true') {
      const chatFiles = await fs.readdir(chatsDir);
      const projectChats = [];
      
      for (const file of chatFiles) {
        if (file.endsWith('.json')) {
          const chatPath = path.join(chatsDir, file);
          const chat = await fs.readJSON(chatPath);
          
          if (chat.project_id == config.id || chat.project_id == project_slug) {
            projectChats.push(chat);
          }
        }
      }
      
      if (projectChats.length > 0) {
        archive.append(JSON.stringify(projectChats, null, 2), { name: 'chats.json' });
      }
    }
    
    // Add .env template
    const envTemplate = `# AI Dashboard Platform Configuration
# Copy this file to .env and configure your settings

PORT=3000
VITE_PORT=5173
AI_PORT=5001
SECONDARY_AI_PORT=5002

# Database (optional)
DATABASE_URL=postgresql://localhost:5432/ai_dashboard
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_dashboard
DB_USER=postgres
DB_PASSWORD=password
`;
    archive.append(envTemplate, { name: '.env.example' });
    
    // Add model launch script
    const launchScript = `#!/bin/bash
# AI Model Launch Script
# Edit this script to configure your model launching

MODEL_PATH="./models/qwen2.5-coder-7b-instruct-q4_k_m.gguf"
PORT=\${AI_PORT:-5001}
THREADS=4
CONTEXT=2048

echo "Launching AI model on port $PORT..."
echo "Model: $MODEL_PATH"
echo "Threads: $THREADS"
echo "Context: $CONTEXT"

# Check if model file exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "Error: Model file not found at $MODEL_PATH"
    echo "Please download a GGUF model and update the MODEL_PATH variable"
    exit 1
fi

# Launch KoboldCpp
python -m koboldcpp \\
    --model "$MODEL_PATH" \\
    --host 127.0.0.1 \\
    --port $PORT \\
    --threads $THREADS \\
    --contextsize $CONTEXT \\
    --batchsize 512 \\
    --quiet

echo "Model stopped"
`;
    archive.append(launchScript, { name: 'start-model.sh' });
    
    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error('Error exporting project:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Generate README content
const generateREADME = (config, projectSlug) => {
  return `# ${config.name || projectSlug}

${config.description || 'AI Dashboard Platform Export'}

**Exported**: ${new Date().toISOString()}

## What's included in this export

- **src/**: All project source code and files
- **uploads/**: Any uploaded files and assets
- **chats.json**: Chat history and conversations (if included)
- **project.json**: Project configuration and metadata
- **start-model.sh**: Editable model launch script
- **.env.example**: Environment configuration template

## Setup Instructions

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment
\`\`\`bash
cp .env.example .env
# Edit .env with your settings
\`\`\`

### 3. Setup Database (Optional)
The platform can run without a database using local files, but PostgreSQL provides better performance:

\`\`\`bash
# Install PostgreSQL and create database
createdb ai_dashboard
\`\`\`

### 4. Download AI Models
Download GGUF models to the \`models/\` directory:

- **Primary Model** (coding): qwen2.5-coder-7b-instruct-q4_k_m.gguf
- **Secondary Model** (optional): TinyLlama or Phi-2

### 5. Install KoboldCpp
\`\`\`bash
pip install koboldcpp
\`\`\`

### 6. Launch the Platform
\`\`\`bash
# Start the full platform
npm run dev

# Or start components separately:
npm run dev:server  # Backend only
npm run dev:client  # Frontend only
\`\`\`

### 7. Launch AI Models
\`\`\`bash
# Make script executable
chmod +x start-model.sh

# Edit the script with your model path
nano start-model.sh

# Launch the model
./start-model.sh
\`\`\`

## Platform Overview

### Ports
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3000 (Express API)
- **Primary AI**: http://localhost:5001 (KoboldCpp)
- **Secondary AI**: http://localhost:5002 (Optional)

### Features
- **Code Editor**: Monaco Editor with AI assistance
- **Chat System**: Project-based conversations with AI
- **File Management**: Upload, edit, and organize project files
- **Secrets Management**: Secure storage of API keys and secrets
- **Export/Import**: Full project packaging and sharing
- **Themes**: Multiple UI themes (Dark-Retro, Light-Hippy, Modern)
- **Search**: Universal search across projects, chats, and files

### Model Configuration
Edit \`start-model.sh\` to configure:
- Model path and filename
- Port number
- Thread count
- Context size
- Memory allocation

### Health Monitoring
The platform includes health checks for:
- Database connectivity
- AI model availability
- File system permissions
- Port availability

## Troubleshooting

### Common Issues

**Port already in use:**
\`\`\`bash
# Find process using port
lsof -i :5001
# Kill process if needed
kill -9 <PID>
\`\`\`

**Model won't start:**
- Check model file exists and path is correct
- Ensure KoboldCpp is installed: \`pip install koboldcpp\`
- Verify sufficient RAM (8GB+ recommended for 7B models)
- Check port availability: \`netstat -an | grep 5001\`

**Database connection failed:**
- Platform will work without database (file-only mode)
- Check PostgreSQL is running: \`brew services start postgresql\`
- Verify database exists: \`psql -l\`

**File permissions:**
\`\`\`bash
# Fix script permissions
chmod +x start-model.sh

# Fix directory permissions
chmod -R 755 projects/ chats/ uploads/
\`\`\`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend server port |
| VITE_PORT | 5173 | Frontend dev server port |
| AI_PORT | 5001 | Primary AI model port |
| SECONDARY_AI_PORT | 5002 | Secondary AI model port |
| DATABASE_URL | - | PostgreSQL connection string |

### Model Recommendations

**For Coding (Primary):**
- qwen2.5-coder-7b-instruct (Recommended)
- deepseek-coder-6.7b-instruct
- codellama-7b-instruct

**For General Chat (Secondary):**
- tinyllama-1.1b-chat (Lightweight)
- phi-2-2.7b (Balanced)
- mistral-7b-instruct (Advanced)

## Development

### Project Structure
\`\`\`
├── src/                 # Frontend React app
├── server/              # Backend API
├── projects/            # User projects
├── chats/               # Chat history
├── uploads/             # Uploaded files
├── models/              # AI model files
├── secrets/             # Encrypted secrets
└── snapshots/           # Project snapshots
\`\`\`

### API Endpoints
- \`GET/POST /api/projects\` - Project management
- \`GET/POST /api/chats\` - Chat system
- \`GET /api/search\` - Universal search
- \`POST /api/upload\` - File uploads
- \`GET /api/export\` - Project export
- \`GET/POST /api/models/*\` - AI model management
- \`GET/POST /api/secrets\` - Secrets management
- \`GET/POST /api/settings\` - Platform settings

### Custom Themes
Themes are defined in \`src/styles/themes.css\`. Create custom themes by:
1. Adding CSS variables for colors
2. Updating the theme selector in settings
3. Implementing theme-specific animations and effects

---

Generated by AI Dashboard Platform v1.0
`;
};

export default router;