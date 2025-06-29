console.log('🛠️ ENV check:', {
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME
});

import pg from 'pg';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_dashboard',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        config JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        model_config JSONB DEFAULT '{}'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default settings if they don't exist
    const defaultSettings = [
      { key: 'theme', value: JSON.stringify({ current: 'dark-retro' }) },
      { key: 'models', value: JSON.stringify({ 
        primary: { name: 'qwen2.5-coder-7b', port: 5001, status: 'inactive' },
        secondary: { name: 'tinyllama', port: 5002, status: 'inactive' }
      }) },
      { key: 'editor', value: JSON.stringify({ 
        autocomplete: true, 
        minimap: true, 
        wordWrap: 'on',
        fontSize: 14
      }) }
    ];

    for (const setting of defaultSettings) {
      await client.query(`
        INSERT INTO settings (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT (key) DO NOTHING
      `, [setting.key, setting.value]);
    }

    client.release();
    console.log('✅ Database initialized successfully');
    
    // Also ensure local file structure
    await ensureLocalStructure();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Continue without database for local-only mode
    console.log('📁 Running in local file mode only');
    await ensureLocalStructure();
  }
};

const ensureLocalStructure = async () => {
  const baseDir = path.join(__dirname, '../../');
  const dirs = [
    'projects',
    'chats', 
    'uploads',
    'snapshots',
    'secrets',
    'models'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(baseDir, dir));
  }
  
  // Create default secrets structure
  const secretsMain = path.join(baseDir, 'secrets', 'main.json');
  if (!await fs.pathExists(secretsMain)) {
    await fs.writeJSON(secretsMain, {});
  }
};

export { pool };