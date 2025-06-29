import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const secretsDir = path.join(__dirname, '../../secrets');
const projectsDir = path.join(__dirname, '../../projects');

// Get secrets (global or project-specific)
router.get('/', async (req, res) => {
  try {
    const { project_slug } = req.query;
    let secretsPath;
    
    if (project_slug) {
      // Project-specific secrets
      secretsPath = path.join(projectsDir, project_slug, 'secrets.json');
    } else {
      // Global secrets
      secretsPath = path.join(secretsDir, 'main.json');
    }
    
    await fs.ensureFile(secretsPath);
    
    let secrets = {};
    if (await fs.pathExists(secretsPath)) {
      secrets = await fs.readJSON(secretsPath);
    }
    
    // Remove actual secret values for security (only return keys and metadata)
    const sanitizedSecrets = {};
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === 'object') {
        sanitizedSecrets[key] = {
          ...value,
          value: value.value ? '***' : ''
        };
      } else {
        sanitizedSecrets[key] = {
          key,
          value: value ? '***' : '',
          description: '',
          global: !project_slug
        };
      }
    }
    
    res.json(sanitizedSecrets);
  } catch (error) {
    console.error('Error fetching secrets:', error);
    res.status(500).json({ error: 'Failed to fetch secrets' });
  }
});

// Set secret
router.post('/', async (req, res) => {
  try {
    const { key, value, description, global, project_slug } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Secret key is required' });
    }
    
    let secretsPath;
    if (global || !project_slug) {
      // Global secret
      secretsPath = path.join(secretsDir, 'main.json');
    } else {
      // Project-specific secret
      secretsPath = path.join(projectsDir, project_slug, 'secrets.json');
    }
    
    await fs.ensureFile(secretsPath);
    
    let secrets = {};
    if (await fs.pathExists(secretsPath)) {
      secrets = await fs.readJSON(secretsPath);
    }
    
    secrets[key] = {
      key,
      value: value || '',
      description: description || '',
      global: global || !project_slug,
      created_at: secrets[key]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await fs.writeJSON(secretsPath, secrets, { spaces: 2 });
    
    // Return sanitized response
    const response = { ...secrets[key] };
    if (response.value) {
      response.value = '***';
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error setting secret:', error);
    res.status(500).json({ error: 'Failed to set secret' });
  }
});

// Delete secret
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { global, project_slug } = req.query;
    
    let secretsPath;
    if (global === 'true' || !project_slug) {
      secretsPath = path.join(secretsDir, 'main.json');
    } else {
      secretsPath = path.join(projectsDir, project_slug, 'secrets.json');
    }
    
    if (!await fs.pathExists(secretsPath)) {
      return res.status(404).json({ error: 'Secrets file not found' });
    }
    
    const secrets = await fs.readJSON(secretsPath);
    
    if (!secrets[key]) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    
    delete secrets[key];
    await fs.writeJSON(secretsPath, secrets, { spaces: 2 });
    
    res.json({ message: 'Secret deleted successfully' });
  } catch (error) {
    console.error('Error deleting secret:', error);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

// Get secret value (for AI injection)
router.get('/value/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { project_slug } = req.query;
    
    // Check project-specific secrets first, then global
    const paths = [];
    if (project_slug) {
      paths.push(path.join(projectsDir, project_slug, 'secrets.json'));
    }
    paths.push(path.join(secretsDir, 'main.json'));
    
    for (const secretsPath of paths) {
      if (await fs.pathExists(secretsPath)) {
        const secrets = await fs.readJSON(secretsPath);
        
        if (secrets[key]) {
          const secret = secrets[key];
          return res.json({
            key,
            value: typeof secret === 'object' ? secret.value : secret,
            found: true
          });
        }
      }
    }
    
    res.json({ key, value: '', found: false });
  } catch (error) {
    console.error('Error getting secret value:', error);
    res.status(500).json({ error: 'Failed to get secret value' });
  }
});

// Process text with secret injection
router.post('/inject', async (req, res) => {
  try {
    const { text, project_slug } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Load all available secrets
    const allSecrets = {};
    
    // Load global secrets
    const globalSecretsPath = path.join(secretsDir, 'main.json');
    if (await fs.pathExists(globalSecretsPath)) {
      const globalSecrets = await fs.readJSON(globalSecretsPath);
      Object.assign(allSecrets, globalSecrets);
    }
    
    // Load project-specific secrets (override global)
    if (project_slug) {
      const projectSecretsPath = path.join(projectsDir, project_slug, 'secrets.json');
      if (await fs.pathExists(projectSecretsPath)) {
        const projectSecrets = await fs.readJSON(projectSecretsPath);
        Object.assign(allSecrets, projectSecrets);
      }
    }
    
    // Replace secret placeholders
    let processedText = text;
    const secretPattern = /\{\{([^}]+)\}\}/g;
    
    processedText = processedText.replace(secretPattern, (match, secretKey) => {
      const secret = allSecrets[secretKey.trim()];
      if (secret) {
        return typeof secret === 'object' ? secret.value : secret;
      }
      return match; // Leave unchanged if secret not found
    });
    
    res.json({ 
      original: text,
      processed: processedText,
      secrets_found: Object.keys(allSecrets).length
    });
  } catch (error) {
    console.error('Error injecting secrets:', error);
    res.status(500).json({ error: 'Failed to inject secrets' });
  }
});

export default router;