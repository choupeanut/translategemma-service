import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:8002';
const WS_URL = 'ws://localhost:8002';

function App() {
  const [status, setStatus] = useState<any>(null);
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
            source_lang: 'en',
            target_lang: 'zh-TW',
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
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Area */}
        <div className="flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Translate Gemma <span className="text-sm font-normal text-red-500">(v2.1 WS Only)</span></h1>
            <p className="text-slate-500 font-medium">Local LLM-powered translation service (WebSocket Streaming)</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">System Status</div>
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                <span className="text-xs font-bold text-slate-700">{status?.gpu?.device_name || 'Connecting...'}</span>
              </div>
              <div className="w-px h-3 bg-slate-200"></div>
              <span className="text-xs font-bold text-blue-600">{status?.model?.vram_usage.toFixed(1) || '0.0'} GB VRAM</span>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Text Area */}
          <div className="relative group">
            <div className="absolute -top-3 left-4 px-2 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-tighter">English Source</div>
            <textarea 
              className="w-full h-96 p-6 bg-white border-2 border-slate-200 rounded-2xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none text-lg text-slate-800 placeholder:text-slate-300"
              placeholder="What would you like to translate?"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>

          {/* Translation Result Area */}
          <div className="relative">
            <div className="absolute -top-3 left-4 px-2 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-tighter">Traditional Chinese</div>
            <div className="w-full h-96 p-6 bg-slate-100/50 border-2 border-slate-200/50 rounded-2xl text-lg text-slate-800 whitespace-pre-wrap overflow-auto font-medium leading-relaxed">
              {translation || <span className="text-slate-300 italic font-normal">Translation result will appear here immediately...</span>}
              {loading && <span className="animate-pulse inline-block ml-1 w-2 h-5 bg-blue-500 align-middle"></span>}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleTranslate}
          disabled={loading || !inputText}
          className={`group relative w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-all overflow-hidden shadow-lg ${ 
            loading 
              ? 'bg-slate-800 text-white cursor-wait' 
              : !inputText
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-900 text-white hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? 'Translating (WS)...' : 'Translate with Gemma'}
            {!loading && <span className="group-hover:translate-x-1 transition-transform">→</span>}
          </span>
        </button>

        {/* Footer Info */}
        <div className="flex justify-center gap-8 pt-4">
           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             Model: Gemma 4B-IT (WebSocket)
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             Engine: PyTorch SDPA + BFloat16
           </div>
        </div>
      </div>
    </div>
  );
}

export default App;