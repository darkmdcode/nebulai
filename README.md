# NebulAI - AI Development Platform

A comprehensive full-stack AI development platform built with React, Node.js, and PostgreSQL. Create, manage, and deploy AI-powered projects with local GGUF model support.

## Features

### 🤖 AI Integration
- **Local GGUF Models**: Run qwen2.5-coder-7b-instruct and other models locally via KoboldCpp
- **Dual Model Support**: Primary coding model + optional lightweight secondary model
- **Smart Context**: Project-aware AI conversations with automatic secret injection
- **Code Generation**: AI can build complete applications from natural language

### 💻 Code Editor
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Live Preview**: Real-time preview for HTML/CSS projects
- **AI Assistance**: "Fix with AI" and "Explain Error" buttons
- **Auto-save**: Automatic file saving with version control
- **Multi-language Support**: JavaScript, TypeScript, Python, HTML, CSS, and more

### 🎨 Theme System
- **Dark Retro**: Cyberpunk aesthetics with neon accents (default)
- **Light Hippy**: Peaceful pastels and natural tones
- **Modern Sleek**: Clean professional design
- **Fully Functional**: Complete theme switching with animations

### 🔒 Security & Secrets
- **Global Secrets**: Platform-wide API keys and configurations
- **Project Secrets**: Per-project sensitive data
- **Auto-injection**: Secrets automatically inserted into AI prompts via `{{secret_name}}`
- **Secure Storage**: Encrypted local storage

### 📁 Project Management
- **Instant Creation**: One-click project creation with AI-generated names
- **Chat-Centric**: Immediate access to AI chat interface
- **File Organization**: Clean project structure with src/ directories
- **Export System**: Full project ZIP exports with README and configs
- **Snapshots**: Save and restore project states

### 💬 Chat System
- **Project Chats**: Conversations tied to specific projects
- **Message History**: Persistent chat storage with auto-save
- **Code Insertion**: Insert AI-generated code directly into editor
- **Multi-model**: Switch between different AI models per conversation

### 🔍 Universal Search
- **Cross-platform**: Search projects, chats, files, and code content
- **Smart Matching**: Relevance-based results with highlighting
- **Quick Navigation**: Jump directly to search results
- **Real-time**: Instant search as you type

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (optional - works without database)
- Python 3.8+ for KoboldCpp
- 8GB+ RAM (16GB recommended for 7B models)

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd nebulai
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Database Setup** (Optional)
   ```bash
   createdb nebulai
   # Platform works without database using local files
   ```

4. **Install KoboldCpp**
   ```bash
   pip install koboldcpp
   ```

5. **Download Models**
   ```bash
   mkdir models
   # Download qwen2.5-coder-7b-instruct-q4_k_m.gguf to models/
   ```

6. **Launch Platform**
   ```bash
   npm run dev
   ```

7. **Start AI Model**
   ```bash
   chmod +x start-model.sh
   ./start-model.sh
   ```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **AI Model**: http://localhost:5001

## Configuration

### Environment Variables
```env
PORT=3000                    # Backend server port
VITE_PORT=5173              # Frontend dev server port
AI_PORT=5001                # Primary AI model port
SECONDARY_AI_PORT=5002      # Secondary AI model port
DATABASE_URL=postgresql://localhost:5432/nebulai
```

### Model Configuration
Edit `start-model.sh` to configure:
- Model file path
- Port number
- Thread count
- Context size
- Memory allocation

### Theme Customization
Themes are defined in `src/styles/themes.css`. Each theme includes:
- Color variables
- Font families
- Animation effects
- Component styling

## Architecture

### Backend (Node.js + Express)
```
server/
├── routes/           # API endpoints
│   ├── projects.js   # Project CRUD
│   ├── chats.js      # Chat management
│   ├── models.js     # AI model control
│   ├── secrets.js    # Secret management
│   ├── search.js     # Universal search
│   └── settings.js   # Platform settings
├── database/         # PostgreSQL integration
└── index.js          # Server entry point
```

### Frontend (React + TypeScript)
```
src/
├── components/       # Reusable UI components
├── pages/           # Main application pages
├── stores/          # Zustand state management
├── styles/          # Theme system and CSS
└── App.tsx          # Application root
```

### File Structure
```
├── projects/        # User projects
├── chats/          # Chat history
├── uploads/        # Uploaded files
├── secrets/        # Encrypted secrets
├── models/         # GGUF model files
└── snapshots/      # Project backups
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:slug` - Get project details
- `PUT /api/projects/:slug` - Update project
- `DELETE /api/projects/:slug` - Delete project
- `GET /api/projects/:slug/files` - List project files
- `GET /api/projects/:slug/files/*` - Get file content
- `PUT /api/projects/:slug/files/*` - Save file content

### Chat System
- `GET /api/chats` - List chats (optionally filtered by project)
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat details
- `PUT /api/chats/:id` - Update chat
- `POST /api/chats/rename` - Rename chat
- `DELETE /api/chats/:id` - Delete chat

### AI Models
- `GET /api/models/list` - List available GGUF models
- `POST /api/models/launch` - Launch model on specified port
- `POST /api/models/generate` - Generate text with model
- `POST /api/models/stop` - Stop running model
- `GET /api/models/status` - Check model status

### Secrets Management
- `GET /api/secrets` - List secrets (sanitized)
- `POST /api/secrets` - Create/update secret
- `DELETE /api/secrets/:key` - Delete secret
- `GET /api/secrets/value/:key` - Get secret value (for injection)
- `POST /api/secrets/inject` - Process text with secret injection

### Search & Export
- `GET /api/search` - Universal search across all content
- `GET /api/export` - Export project as ZIP
- `POST /api/upload` - Upload files to project
- `GET /api/health` - System health check

## User Experience

### Chat-Centric Design
NebulAI opens directly to a chat interface, similar to Bolt.new and Replit:

- **Immediate Usability**: Chat input is auto-focused and ready for use
- **Auto Project Creation**: Creates a project automatically if none exist
- **Smart Naming**: Projects get AI-generated names like "Neon Studio", "Quantum Lab"
- **Inline Editing**: Rename projects directly in the chat header

### Instant Project Creation
- One-click project creation with no modals or forms
- AI-generated creative names using word combinations
- Immediate access to chat interface
- Frictionless workflow for rapid prototyping

### Sidebar Navigation
- Collapsible project list with instant switching
- Recent chats section
- Integrated search bar
- Theme toggle and settings access
- Current project display with editor access

## Development

### Adding New Themes
1. Define CSS variables in `src/styles/themes.css`
2. Add theme to `src/stores/theme.ts`
3. Create theme preview in settings
4. Test all components with new theme

### Custom AI Models
1. Place GGUF files in `models/` directory
2. Update `start-model.sh` with model path
3. Configure port and parameters
4. Launch via Settings > AI Models

### Database Schema
```sql
-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  config JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active'
);

-- Chats table
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_config JSONB DEFAULT '{}'
);

-- Settings table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
lsof -i :5001
kill -9 <PID>
```

**Model Won't Start**
- Check model file exists and path is correct
- Verify KoboldCpp installation: `pip install koboldcpp`
- Ensure sufficient RAM (8GB+ for 7B models)
- Check port availability

**Database Connection Failed**
- Platform works without database (file-only mode)
- Check PostgreSQL is running
- Verify database exists and credentials

**File Permissions**
```bash
chmod +x start-model.sh
chmod -R 755 projects/ chats/ uploads/
```

### Performance Optimization
- Use SSD storage for better file I/O
- Allocate sufficient RAM for models
- Close unused browser tabs
- Monitor system resources

### Model Recommendations

**For Coding (Primary)**
- qwen2.5-coder-7b-instruct (Recommended)
- deepseek-coder-6.7b-instruct
- codellama-7b-instruct

**For General Chat (Secondary)**
- tinyllama-1.1b-chat (Lightweight)
- phi-2-2.7b (Balanced)
- mistral-7b-instruct (Advanced)

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use semantic commit messages
- Add tests for new features
- Update documentation
- Ensure theme compatibility

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: Check README and inline comments
- **Issues**: Open GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our Discord server

---

**Built with ❤️ for the AI development community**