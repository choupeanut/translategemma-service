// Dynamic API URL based on current host
const getApiUrl = () => {
    // If VITE_API_URL is explicitly set (e.g. production build), use it
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    
    // Otherwise, assume backend is on port 8002 of the same host
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:8002`;
    }
    return 'http://localhost:8002';
};

const API_URL = getApiUrl();

export type TranslateRequest = {
  type: 'text' | 'image';
  source_lang: string;
  target_lang: string;
  content?: string;
  image_data?: string;
  model?: '4b' | '12b';
};

export type TranslateResponse = {
  translation: string;
  model_used: string;
  time_taken?: number;
};

export type StatusResponse = {
  gpu: {
    available: boolean;
    device_name: string | null;
  };
  model: {
    status: 'loaded' | 'not_loaded';
    model?: string;
    vram_usage: number;
  };
};

export const api = {
  translate: async (data: TranslateRequest): Promise<TranslateResponse> => {
    const response = await fetch(`${API_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Translation failed');
    return response.json();
  },
  
  getStatus: async (): Promise<StatusResponse> => {
    const response = await fetch(`${API_URL}/api/status`);
    if (!response.ok) throw new Error('Status check failed');
    return response.json();
  },
  
  switchModel: async (model: '4b' | '12b'): Promise<void> => {
    await fetch(`${API_URL}/api/model/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
  }
};