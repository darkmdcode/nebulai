import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/init.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatsDir = path.join(__dirname, '../../chats');

// Get all chats for a project
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    
    // Try database first
    try {
      const client = await pool.connect();
      let query = 'SELECT * FROM chats';
      let params = [];
      
      if (project_id) {
        query += ' WHERE project_id = $1';
        params.push(project_id);
      }
      
      query += ' ORDER BY updated_at DESC';
      
      const result = await client.query(query, params);
      client.release();
      return res.json(result.rows);
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const chats = [];
    const chatFiles = await fs.readdir(chatsDir);
    
    for (const file of chatFiles) {
      if (file.endsWith('.json')) {
        const chatPath = path.join(chatsDir, file);
        const chat = await fs.readJSON(chatPath);
        
        if (!project_id || chat.project_id == project_id) {
          chats.push(chat);
        }
      }
    }
    
    res.json(chats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Create new chat
router.post('/', async (req, res) => {
  try {
    const { project_id, title, model_config } = req.body;
    
    const chatData = {
      id: Date.now(),
      project_id: project_id || null,
      title: title || 'New Chat',
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      model_config: model_config || {}
    };
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query(`
        INSERT INTO chats (project_id, title, messages, created_at, updated_at, model_config)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        chatData.project_id,
        chatData.title,
        JSON.stringify(chatData.messages),
        chatData.created_at,
        chatData.updated_at,
        JSON.stringify(chatData.model_config)
      ]);
      
      client.release();
      chatData.id = result.rows[0].id;
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Save to file system
    const chatPath = path.join(chatsDir, `${chatData.id}.json`);
    await fs.writeJSON(chatPath, chatData, { spaces: 2 });
    
    res.status(201).json(chatData);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Get specific chat
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM chats WHERE id = $1', [id]);
      client.release();
      
      if (result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const chatPath = path.join(chatsDir, `${id}.json`);
    
    if (!await fs.pathExists(chatPath)) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chat = await fs.readJSON(chatPath);
    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Update chat
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query(`
        UPDATE chats 
        SET title = COALESCE($2, title),
            messages = COALESCE($3, messages),
            model_config = COALESCE($4, model_config),
            updated_at = $5
        WHERE id = $1
        RETURNING *
      `, [
        id,
        updates.title,
        updates.messages ? JSON.stringify(updates.messages) : null,
        updates.model_config ? JSON.stringify(updates.model_config) : null,
        new Date().toISOString()
      ]);
      
      client.release();
      
      if (result.rows.length > 0) {
        // Also update file system
        const chatPath = path.join(chatsDir, `${id}.json`);
        if (await fs.pathExists(chatPath)) {
          const existingChat = await fs.readJSON(chatPath);
          const updatedChat = { ...existingChat, ...updates, updated_at: new Date().toISOString() };
          await fs.writeJSON(chatPath, updatedChat, { spaces: 2 });
        }
        
        return res.json(result.rows[0]);
      }
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const chatPath = path.join(chatsDir, `${id}.json`);
    
    if (!await fs.pathExists(chatPath)) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const existingChat = await fs.readJSON(chatPath);
    const updatedChat = { 
      ...existingChat, 
      ...updates, 
      updated_at: new Date().toISOString() 
    };
    
    await fs.writeJSON(chatPath, updatedChat, { spaces: 2 });
    res.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Rename chat
router.post('/rename', async (req, res) => {
  try {
    const { id, title } = req.body;
    
    if (!id || !title) {
      return res.status(400).json({ error: 'Chat ID and title are required' });
    }
    
    // Try database first
    try {
      const client = await pool.connect();
      const result = await client.query(`
        UPDATE chats 
        SET title = $2, updated_at = $3
        WHERE id = $1
        RETURNING *
      `, [id, title, new Date().toISOString()]);
      
      client.release();
      
      if (result.rows.length > 0) {
        // Also update file system
        const chatPath = path.join(chatsDir, `${id}.json`);
        if (await fs.pathExists(chatPath)) {
          const chat = await fs.readJSON(chatPath);
          chat.title = title;
          chat.updated_at = new Date().toISOString();
          await fs.writeJSON(chatPath, chat, { spaces: 2 });
        }
        
        return res.json(result.rows[0]);
      }
    } catch (dbError) {
      console.log('Database unavailable, using file system');
    }
    
    // Fallback to file system
    const chatPath = path.join(chatsDir, `${id}.json`);
    
    if (!await fs.pathExists(chatPath)) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chat = await fs.readJSON(chatPath);
    chat.title = title;
    chat.updated_at = new Date().toISOString();
    
    await fs.writeJSON(chatPath, chat, { spaces: 2 });
    res.json(chat);
  } catch (error) {
    console.error('Error renaming chat:', error);
    res.status(500).json({ error: 'Failed to rename chat' });
  }
});

// Delete chat
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try database first
    try {
      const client = await pool.connect();
      await client.query('DELETE FROM chats WHERE id = $1', [id]);
      client.release();
    } catch (dbError) {
      console.log('Database unavailable, using file system only');
    }
    
    // Remove from file system
    const chatPath = path.join(chatsDir, `${id}.json`);
    if (await fs.pathExists(chatPath)) {
      await fs.remove(chatPath);
    }
    
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;