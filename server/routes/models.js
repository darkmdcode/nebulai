import express from 'express';
import { spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let modelProcesses = new Map();

// List available models
router.get('/list', async (req, res) => {
  try {
    const modelsDir = path.join(__dirname, '../../models');
    await fs.ensureDir(modelsDir);
    
    const files = await fs.readdir(modelsDir);
    const models = files
      .filter(file => file.endsWith('.gguf'))
      .map(file => ({
        name: file.replace('.gguf', ''),
        filename: file,
        path: path.join(modelsDir, file),
        size: 0 // Will be populated if needed
      }));
    
    // Add size information
    for (const model of models) {
      try {
        const stats = await fs.stat(model.path);
        model.size = stats.size;
      } catch (error) {
        model.size = 0;
      }
    }
    
    res.json(models);
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// Launch model
router.post('/launch', async (req, res) => {
  try {
    const { modelPath, port, config = {} } = req.body;
    
    if (!modelPath || !port) {
      return res.status(400).json({ error: 'Model path and port are required' });
    }
    
    // Check if port is already in use
    if (modelProcesses.has(port)) {
      return res.status(400).json({ error: `Port ${port} is already in use` });
    }
    
    // Default configuration
    const defaultConfig = {
      host: '127.0.0.1',
      port: port,
      threads: 4,
      context: 2048,
      batch_size: 512,
      ...config
    };
    
    // Launch KoboldCpp
    const args = [
      '--model', modelPath,
      '--host', defaultConfig.host,
      '--port', defaultConfig.port.toString(),
      '--threads', defaultConfig.threads.toString(),
      '--contextsize', defaultConfig.context.toString(),
      '--batchsize', defaultConfig.batch_size.toString(),
      '--quiet'
    ];
    
    const modelProcess = spawn('python', ['-m', 'koboldcpp', ...args], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    modelProcesses.set(port, {
      process: modelProcess,
      config: defaultConfig,
      modelPath,
      startTime: new Date()
    });
    
    modelProcess.stdout.on('data', (data) => {
      console.log(`Model ${port}:`, data.toString());
    });
    
    modelProcess.stderr.on('data', (data) => {
      console.error(`Model ${port} error:`, data.toString());
    });
    
    modelProcess.on('close', (code) => {
      console.log(`Model process ${port} exited with code ${code}`);
      modelProcesses.delete(port);
    });
    
    // Wait a moment for the process to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      message: 'Model launched successfully',
      port,
      config: defaultConfig,
      status: 'starting'
    });
  } catch (error) {
    console.error('Error launching model:', error);
    res.status(500).json({ error: 'Failed to launch model' });
  }
});

// Generate text
router.post('/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      port = process.env.AI_PORT || 5001,
      max_tokens = 500,
      temperature = 0.7,
      top_p = 0.9,
      stop = []
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Make request to KoboldCpp API
    const response = await axios.post(`http://localhost:${port}/api/v1/generate`, {
      prompt,
      max_length: max_tokens,
      temperature,
      top_p,
      stop_sequence: stop,
      rep_pen: 1.1,
      rep_pen_range: 1024,
      sampler_order: [6, 0, 1, 3, 4, 2, 5],
      memory: '',
      genkey: 'KCPP',
      max_context_length: 2048,
      quiet: true
    }, {
      timeout: 60000 // 60 second timeout
    });
    
    if (response.data && response.data.results) {
      res.json({
        text: response.data.results[0]?.text || '',
        usage: {
          prompt_tokens: prompt.length / 4, // Rough estimate
          completion_tokens: response.data.results[0]?.text?.length / 4 || 0
        }
      });
    } else {
      throw new Error('Invalid response from model');
    }
  } catch (error) {
    console.error('Error generating text:', error);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Model not available',
        message: `No model running on port ${req.body.port || process.env.AI_PORT || 5001}`
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Generation timeout',
        message: 'The model took too long to respond'
      });
    } else {
      res.status(500).json({ 
        error: 'Generation failed',
        message: error.message 
      });
    }
  }
});

// Stop model
router.post('/stop', async (req, res) => {
  try {
    const { port } = req.body;
    
    if (!port) {
      return res.status(400).json({ error: 'Port is required' });
    }
    
    const modelInfo = modelProcesses.get(port);
    if (!modelInfo) {
      return res.status(404).json({ error: 'No model running on this port' });
    }
    
    modelInfo.process.kill('SIGTERM');
    modelProcesses.delete(port);
    
    res.json({ message: 'Model stopped successfully' });
  } catch (error) {
    console.error('Error stopping model:', error);
    res.status(500).json({ error: 'Failed to stop model' });
  }
});

// Get model status
router.get('/status', async (req, res) => {
  try {
    const { port } = req.query;
    
    if (port) {
      // Check specific port
      const modelInfo = modelProcesses.get(parseInt(port));
      if (!modelInfo) {
        return res.json({ port: parseInt(port), status: 'inactive' });
      }
      
      // Try to ping the model
      try {
        await axios.get(`http://localhost:${port}/api/v1/model`, { timeout: 5000 });
        res.json({
          port: parseInt(port),
          status: 'active',
          config: modelInfo.config,
          modelPath: modelInfo.modelPath,
          uptime: Date.now() - modelInfo.startTime.getTime()
        });
      } catch (error) {
        res.json({ port: parseInt(port), status: 'starting' });
      }
    } else {
      // Get status of all models
      const statuses = [];
      
      for (const [port, modelInfo] of modelProcesses.entries()) {
        try {
          await axios.get(`http://localhost:${port}/api/v1/model`, { timeout: 2000 });
          statuses.push({
            port,
            status: 'active',
            config: modelInfo.config,
            modelPath: modelInfo.modelPath,
            uptime: Date.now() - modelInfo.startTime.getTime()
          });
        } catch (error) {
          statuses.push({ port, status: 'starting' });
        }
      }
      
      res.json(statuses);
    }
  } catch (error) {
    console.error('Error checking model status:', error);
    res.status(500).json({ error: 'Failed to check model status' });
  }
});

export default router;