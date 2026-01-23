import { useState, useRef, useCallback, useEffect } from 'react';

// Helper to determine WebSocket URL
const getWsUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        const envApi = import.meta.env.VITE_API_URL;
        const { hostname } = window.location;
        // Simple logic: if env is set, use it. Replace http with ws.
        // If relative, use current host.
        if (envApi.startsWith('http')) {
            return envApi.replace(/^http/, 'ws');
        }
    }
    const { protocol, host } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${host}`;
};

interface TranslationState {
    translation: string;
    loading: boolean;
    error: string | null;
    isDone: boolean;
}

interface UseTranslationReturn extends TranslationState {
    translate: (text: string, sourceLang: string, targetLang: string) => void;
    stop: () => void;
    connected: boolean;
}

export function useTranslation(): UseTranslationReturn {
    const [state, setState] = useState<TranslationState>({
        translation: '',
        loading: false,
        error: null,
        isDone: false
    });
    const [connected, setConnected] = useState(false);
    
    const wsRef = useRef<WebSocket | null>(null);
    const WS_URL = getWsUrl();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setState(prev => ({ ...prev, loading: false }));
        setConnected(false);
    }, []);

    const translate = useCallback((text: string, sourceLang: string, targetLang: string) => {
        if (!text.trim()) return;

        // Reset state for new translation
        setState({
            translation: '',
            loading: true,
            error: null,
            isDone: false
        });

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            const ws = new WebSocket(`${WS_URL}/ws/translate`);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                ws.send(JSON.stringify({
                    type: 'text',
                    source_lang: sourceLang,
                    target_lang: targetLang,
                    content: text,
                    model: '4b'
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.chunk) {
                        setState(prev => ({ 
                            ...prev, 
                            translation: prev.translation + data.chunk 
                        }));
                    } else if (data.done) {
                        setState(prev => ({ 
                            ...prev, 
                            loading: false, 
                            isDone: true 
                        }));
                        ws.close();
                    } else if (data.error) {
                        setState(prev => ({ 
                            ...prev, 
                            loading: false, 
                            error: data.error 
                        }));
                        ws.close();
                    }
                } catch (e) {
                    console.error("Failed to parse WS message", event.data);
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setState(prev => ({ 
                    ...prev, 
                    loading: false, 
                    error: "Connection failed. Please check backend status." 
                }));
            };

            ws.onclose = () => {
                setConnected(false);
                setState(prev => {
                    // If we closed it manually or it finished, loading should be false.
                    // If it closed unexpectedly while loading, it might be an error (handled by onerror usually, but just in case)
                    return { ...prev, loading: false };
                });
            };

        } catch (err) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                error: "Failed to initialize WebSocket" 
            }));
        }
    }, [WS_URL]);

    return {
        ...state,
        translate,
        stop,
        connected
    };
}
