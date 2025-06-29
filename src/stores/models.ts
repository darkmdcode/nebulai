import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export interface ModelStatus {
  port: number;
  status: 'active' | 'inactive' | 'starting' | 'error';
  config?: Record<string, any>;
  modelPath?: string;
  uptime?: number;
}

export interface ModelFile {
  name: string;
  filename: string;
  path: string;
  size: number;
}

interface ModelsStore {
  models: ModelFile[];
  modelStatus: ModelStatus[];
  healthStatus: Record<string, any>;
  loading: boolean;
  
  // Actions
  fetchModels: () => Promise<void>;
  launchModel: (config: { modelPath: string; port: number; config?: Record<string, any> }) => Promise<void>;
  stopModel: (port: number) => Promise<void>;
  checkModelStatus: (port?: number) => Promise<void>;
  generateText: (prompt: string, port?: number, options?: Record<string, any>) => Promise<string>;
  checkHealth: () => Promise<void>;
}

export const useModelsStore = create<ModelsStore>((set, get) => ({
  models: [],
  modelStatus: [],
  healthStatus: {},
  loading: false,

  fetchModels: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('/api/models/list');
      set({ models: response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      toast.error('Failed to load models');
      set({ loading: false });
    }
  },

  launchModel: async (config) => {
    try {
      const response = await axios.post('/api/models/launch', config);
      toast.success(`Model launching on port ${config.port}`);
      
      // Update status
      await get().checkModelStatus(config.port);
    } catch (error) {
      console.error('Failed to launch model:', error);
      const message = error.response?.data?.error || 'Failed to launch model';
      toast.error(message);
      throw error;
    }
  },

  stopModel: async (port) => {
    try {
      await axios.post('/api/models/stop', { port });
      toast.success(`Model on port ${port} stopped`);
      
      // Update status
      set((state) => ({
        modelStatus: state.modelStatus.filter(s => s.port !== port)
      }));
    } catch (error) {
      console.error('Failed to stop model:', error);
      toast.error('Failed to stop model');
      throw error;
    }
  },

  checkModelStatus: async (port) => {
    try {
      const params = port ? { port } : {};
      const response = await axios.get('/api/models/status', { params });
      
      if (port) {
        // Update specific model status
        set((state) => ({
          modelStatus: state.modelStatus.filter(s => s.port !== port).concat([response.data])
        }));
      } else {
        // Update all model statuses
        set({ modelStatus: response.data });
      }
    } catch (error) {
      console.error('Failed to check model status:', error);
    }
  },

  generateText: async (prompt, port = 5001, options = {}) => {
    try {
      const response = await axios.post('/api/models/generate', {
        prompt,
        port,
        ...options
      });
      
      return response.data.text || '';
    } catch (error) {
      console.error('Failed to generate text:', error);
      const message = error.response?.data?.error || 'Failed to generate text';
      toast.error(message);
      throw error;
    }
  },

  checkHealth: async () => {
    try {
      const response = await axios.get('/api/health');
      set({ healthStatus: response.data });
    } catch (error) {
      console.error('Failed to check health:', error);
      set({ 
        healthStatus: { 
          status: 'error', 
          message: 'Health check failed',
          services: {}
        } 
      });
    }
  }
}));