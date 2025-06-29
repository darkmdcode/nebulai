import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/init.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsDir = path.join(__dirname, '../../settings');

// Get all settings
router.get('/', async (req, res) => {
  try {
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM settings');
      client.release();
      
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = row.value;
      });
      
      return res.json(settings);
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const settingsPath = path.join(settingsDir, 'settings.json');
    await fs.ensureFile(settingsPath);
    
    let settings = {};
    if (await fs.pathExists(settingsPath)) {
      settings = await fs.readJSON(settingsPath);
    }
    
    // Ensure default settings exist
    const defaults = {
      theme: { current: 'dark-retro' },
      models: {
        primary: { name: 'qwen2.5-coder-7b', port: 5001, status: 'inactive' },
        secondary: { name: 'tinyllama', port: 5002, status: 'inactive' }
      },
      editor: {
        autocomplete: true,
        minimap: true,
        wordWrap: 'on',
        fontSize: 14,
        theme: 'vs-dark'
      }
    };
    
    const mergedSettings = { ...defaults, ...settings };
    
    // Save back if it was empty
    if (Object.keys(settings).length === 0) {
      await fs.writeJSON(settingsPath, mergedSettings, { spaces: 2 });
    }
    
    res.json(mergedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    const updates = req.body;
    
    // Try database first
    try {
      const client = await pool.connect();
      
      for (const [key, value] of Object.entries(updates)) {
        await client.query(`
          INSERT INTO settings (key, value, updated_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (key) DO UPDATE SET
            value = $2,
            updated_at = $3
        `, [key, JSON.stringify(value), new Date().toISOString()]);
      }
      
      client.release();
      
      // Also update file system
      const settingsPath = path.join(settingsDir, 'settings.json');
      await fs.ensureFile(settingsPath);
      
      let settings = {};
      if (await fs.pathExists(settingsPath)) {
        settings = await fs.readJSON(settingsPath);
      }
      
      Object.assign(settings, updates);
      await fs.writeJSON(settingsPath, settings, { spaces: 2 });
      
      return res.json(settings);
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const settingsPath = path.join(settingsDir, 'settings.json');
    await fs.ensureFile(settingsPath);
    
    let settings = {};
    if (await fs.pathExists(settingsPath)) {
      settings = await fs.readJSON(settingsPath);
    }
    
    Object.assign(settings, updates);
    await fs.writeJSON(settingsPath, settings, { spaces: 2 });
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT value FROM settings WHERE key = $1', [key]);
      client.release();
      
      if (result.rows.length > 0) {
        return res.json(result.rows[0].value);
      }
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const settingsPath = path.join(settingsDir, 'settings.json');
    
    if (!await fs.pathExists(settingsPath)) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    const settings = await fs.readJSON(settingsPath);
    
    if (!settings[key]) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json(settings[key]);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

export default router;