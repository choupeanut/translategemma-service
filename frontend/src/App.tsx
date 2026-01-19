import { useState, useEffect, useRef } from 'react';
import { LANGUAGES } from './lib/languages';

// Dynamic URL detection
const getBaseUrl = () => {
  const { hostname, protocol, port } = window.location;

  // 1. Respect Build-time override ONLY if it's not a generic localhost default
  if (import.meta.env.VITE_API_URL) {
    const envApi = import.meta.env.VITE_API_URL;
    const isEnvLocal = envApi.includes('localhost') || envApi.includes('127.0.0.1');
    const isActualLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // If env says localhost but we are on an IP, ignore the env.
    if (!(isEnvLocal && !isActualLocal)) {
      const api = envApi;
      const ws = api.replace(/^http/, 'ws');
      return { api, ws };
    }
  }

  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (port === "" || port === "80" || port === "443") {
    return {
      api: `${protocol}//${hostname}`,
      ws: `${wsProtocol}//${hostname}`
    };
  }

  return {
    api: `${protocol}//${hostname}:8002`,
    ws: `${wsProtocol}//${hostname}:8002`
  };
};

function App() {
  const { api: API_URL, ws: WS_URL } = getBaseUrl();
  const [status, setStatus] = useState<any>(null);
  
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh-TW');
  
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function getStatus() {
      try {
        const res = await fetch(`${API_URL}/api/status`);
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error("Status fetch failed", err);
      }
    }
    getStatus();
  }, []);

  const handleTranslate = () => {
    if (!inputText) return;
    
    if (wsRef.current) {
        wsRef.current.close();
    }

    setLoading(true);
    setTranslation('');

    const ws = new WebSocket(`${WS_URL}/ws/translate`);
    wsRef.current = ws;

    ws.onopen = () => {
        console.log("WebSocket connected");
        ws.send(JSON.stringify({
            type: 'text',
            source_lang: sourceLang,
            target_lang: targetLang,
            content: inputText,
            model: '4b'
        }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.chunk) {
                setTranslation(prev => prev + data.chunk);
            } else if (data.done) {
                console.log("Translation done");
                setLoading(false);
                ws.close();
            } else if (data.error) {
                console.error("WS Error:", data.error);
                setTranslation(prev => prev + `\n[Error: ${data.error}]`);
                setLoading(false);
            }
        } catch (e) {
            console.error("Failed to parse WS message", event.data);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setTranslation(prev => prev + "\n[Connection Error]");
        setLoading(false);
    };

    ws.onclose = () => {
        console.log("WebSocket closed");
        if (loading) setLoading(false);
    };
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Header Area */}
      <header className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Translate Gemma 
            <span className="text-xs font-medium text-white bg-blue-600 px-2 py-0.5 rounded-full">v2.2</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* GPU Status Pill */}
           <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                <span className="text-xs font-bold text-slate-700 hidden sm:inline">{status?.gpu?.device_name || 'Connecting...'}</span>
              </div>
              <div className="w-px h-3 bg-slate-300"></div>
              <span className="text-xs font-bold text-blue-600">{status?.model?.vram_usage.toFixed(1) || '0.0'} GB VRAM</span>
            </div>
        </div>
      </header>

      {/* Main Content - Flex Grow to fill screen */}
      <main className="flex-grow flex flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden">
        
        {/* Source Column */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          {/* Toolbar */}
          <div className="flex-none p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <div className="relative">
                <select 
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="appearance-none bg-transparent font-bold text-slate-700 text-sm py-1 pr-8 pl-2 rounded hover:bg-slate-200/50 focus:outline-none cursor-pointer"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</span>
             </div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Input</span>
          </div>
          
          {/* Input Area */}
          <textarea 
            className="flex-grow w-full p-4 md:p-6 resize-none outline-none text-lg text-slate-800 placeholder:text-slate-300 bg-transparent"
            placeholder="Type or paste text to translate..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
        </div>

        {/* Action Column (Center/Middle) */}
        <div className="flex-none flex md:flex-col justify-center items-center gap-2 px-2">
           <button 
             onClick={handleTranslate}
             disabled={loading || !inputText}
             className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${ 
               loading 
                 ? 'bg-slate-800 text-white cursor-wait animate-spin' 
                 : !inputText
                   ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                   : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95'
             }`}
             title="Translate"
           >
             {loading ? (
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
               </svg>
             )}
           </button>
        </div>

        {/* Target Column */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 rounded-2xl shadow-inner border border-slate-200/60 overflow-hidden">
          {/* Toolbar */}
          <div className="flex-none p-3 border-b border-slate-200/50 flex justify-between items-center">
             <div className="relative">
                <select 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="appearance-none bg-transparent font-bold text-blue-700 text-sm py-1 pr-8 pl-2 rounded hover:bg-blue-50 focus:outline-none cursor-pointer"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400 text-xs">▼</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => navigator.clipboard.writeText(translation)}
                  className="text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-wider px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
             </div>
          </div>

          {/* Output Area */}
          <div className="flex-grow w-full p-4 md:p-6 overflow-auto text-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
             {translation || <span className="text-slate-300 italic">Translation will appear here...</span>}
             {loading && <span className="animate-pulse inline-block ml-1 w-2 h-5 bg-blue-500 align-middle"></span>}
          </div>
        </div>

      </main>

      {/* Footer Status */}
      <footer className="flex-none py-2 px-6 text-[10px] text-slate-400 flex justify-between bg-white border-t border-slate-100">
         <div>API: {API_URL}</div>
         <div className="flex gap-4">
            <span>Model: Gemma 4B-IT</span>
            <span>Engine: PyTorch SDPA + BFloat16</span>
         </div>
      </footer>
    </div>
  );
}

export default App;
