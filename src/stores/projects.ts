import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export interface Project {
  id: number;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  config: Record<string, any>;
  status: string;
}

export interface ProjectFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: ProjectFile[];
}

interface ProjectsStore {
  projects: Project[];
  currentProject: Project | null;
  currentFiles: ProjectFile[];
  currentFileContent: string;
  currentFilePath: string;
  loading: boolean;
  
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: { name: string; description?: string }) => Promise<Project>;
  updateProject: (slug: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (slug: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  
  // File operations
  fetchFiles: (slug: string) => Promise<void>;
  fetchFileContent: (slug: string, filePath: string) => Promise<void>;
  saveFileContent: (slug: string, filePath: string, content: string) => Promise<void>;
  setCurrentFileContent: (content: string) => void;
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: [],
  currentProject: null,
  currentFiles: [],
  currentFileContent: '',
  currentFilePath: '',
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('/api/projects');
      set({ projects: response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
      set({ loading: false });
    }
  },

  createProject: async (data) => {
    try {
      const response = await axios.post('/api/projects', data);
      const newProject = response.data;
      
      set((state) => ({
        projects: [newProject, ...state.projects]
      }));
      
      toast.success('Project created successfully');
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      throw error;
    }
  },

  updateProject: async (slug, data) => {
    try {
      const response = await axios.put(`/api/projects/${slug}`, data);
      const updatedProject = response.data;
      
      set((state) => ({
        projects: state.projects.map((p) => 
          p.slug === slug ? updatedProject : p
        ),
        currentProject: state.currentProject?.slug === slug ? updatedProject : state.currentProject
      }));
      
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
      throw error;
    }
  },

  deleteProject: async (slug) => {
    try {
      await axios.delete(`/api/projects/${slug}`);
      
      set((state) => ({
        projects: state.projects.filter((p) => p.slug !== slug),
        currentProject: state.currentProject?.slug === slug ? null : state.currentProject
      }));
      
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
      throw error;
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  fetchFiles: async (slug) => {
    try {
      const response = await axios.get(`/api/projects/${slug}/files`);
      set({ currentFiles: response.data });
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load project files');
    }
  },

  fetchFileContent: async (slug, filePath) => {
    try {
      const response = await axios.get(`/api/projects/${slug}/files/${filePath}`);
      set({ 
        currentFileContent: response.data.content,
        currentFilePath: filePath
      });
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      toast.error('Failed to load file');
    }
  },

  saveFileContent: async (slug, filePath, content) => {
    try {
      await axios.put(`/api/projects/${slug}/files/${filePath}`, { content });
      set({ currentFileContent: content });
      toast.success('File saved successfully');
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error('Failed to save file');
      throw error;
    }
  },

  setCurrentFileContent: (content) => {
    set({ currentFileContent: content });
  }
}));