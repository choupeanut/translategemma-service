import { useState, useEffect } from 'react';
import { useTranslation } from './hooks/useTranslation';
import { LANGUAGES } from './lib/languages';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { ArrowRight, Copy, Check, Terminal, Cpu, Activity, Languages } from 'lucide-react';

function App() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh-TW');
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const { translate, translation, loading, error, isDone, stop } = useTranslation();

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/status`);
        const data = await res.json();
        setStatus(data);
      } catch (e) {
        console.error("Status fetch failed", e);
      }
    };
    fetchStatus();
  }, []);

  const handleTranslate = () => {
    if (!inputText) return;
    translate(inputText, sourceLang, targetLang);
  };

  const copyToClipboard = () => {
    if (!translation) return;
    navigator.clipboard.writeText(translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-[1800px] px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              T
            </div>
            <span className="font-bold text-xl tracking-tight">TranslateGemma</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              v2.3
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
             {status && (
               <div className="hidden md:flex items-center gap-3 bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-200/50">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className={status.gpu.available ? "text-green-500" : "text-amber-500"} />
                    <span>{status.gpu.device_name || 'CPU Mode'}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-300"></div>
                  <div className="flex items-center gap-1.5">
                    <Cpu size={12} className="text-blue-500" />
                    <span>{status.model.vram_usage.toFixed(1)} GB</span>
                  </div>
               </div>
             )}
             <div className="flex flex-col items-end gap-0.5">
               <a href="https://github.com/choupeanut/translategemma-service" target="_blank" rel="noreferrer" className="text-slate-900 hover:text-blue-600 transition-colors font-bold">
                 Peanut Chou / TranslateGemma
               </a>
               <span className="text-[10px] text-slate-400">Forked from google-deepmind/gemma</span>
             </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-[1800px] px-4 py-3">
        <div className="w-full mx-auto space-y-8">
          
          {/* Main Translation Interface */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid md:grid-cols-[1fr,auto,1fr] gap-0">
            
            {/* Source Panel */}
            <div className="flex flex-col h-[600px] md:h-[800px] group focus-within:bg-slate-50/30 transition-colors">
              <div className="flex-none p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="relative">
                  <select 
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="appearance-none bg-transparent font-semibold text-slate-700 text-sm py-1 pr-8 pl-2 rounded hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name} ({lang.code})</option>
                    ))}
                  </select>
                  <Languages size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Source</span>
              </div>
              
              <textarea 
                className="flex-grow w-full p-6 resize-none outline-none text-lg md:text-xl text-slate-800 placeholder:text-slate-300 bg-transparent leading-relaxed"
                placeholder="Enter text to translate..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                autoFocus
              />
              
              <div className="flex-none p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                <span className="text-xs text-slate-400">{inputText.length} chars</span>
                <Button 
                   onClick={handleTranslate} 
                   disabled={loading || !inputText}
                   className="rounded-full shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Translating...' : 'Translate'}
                </Button>
              </div>
            </div>

            {/* Middle Divider / Action Area (Desktop) */}
            <div className="hidden md:flex flex-col justify-center items-center relative w-px bg-slate-100">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                 <div className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm text-slate-400">
                   <ArrowRight size={16} />
                 </div>
               </div>
            </div>

            {/* Target Panel */}
            <div className="flex flex-col h-[600px] md:h-[800px] bg-slate-50/30">
              <div className="flex-none p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="relative">
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="appearance-none bg-transparent font-semibold text-blue-700 text-sm py-1 pr-8 pl-2 rounded hover:bg-blue-50 focus:outline-none cursor-pointer transition-colors"
                  >
                     {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name} ({lang.code})</option>
                    ))}
                  </select>
                  <Languages size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400" />
                </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy"
                    >
                      {copied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}
                    </button>
                 </div>
              </div>

              <div className="flex-grow w-full p-6 overflow-auto text-lg md:text-xl text-slate-800 leading-relaxed whitespace-pre-wrap relative">
                 {loading && !translation && (
                    <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                      <Terminal size={18} />
                      <span>Initializing stream...</span>
                    </div>
                 )}
                 {translation}
                 {loading && <span className="inline-block w-2 h-5 bg-blue-500 ml-1 align-middle animate-pulse"></span>}
                 {!translation && !loading && (
                    <span className="text-slate-300 italic">Translation will appear here...</span>
                 )}
                 
                 {error && (
                   <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm p-6 text-center">
                      <div className="text-red-500 max-w-xs">
                        <p className="font-bold mb-2">Translation Failed</p>
                        <p className="text-sm opacity-80">{error}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={handleTranslate}>Retry</Button>
                      </div>
                   </div>
                 )}
              </div>
              
               <div className="flex-none p-4 border-t border-slate-100 flex justify-end items-center bg-slate-50/50">
                  {isDone && (
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <Check size={12} /> Complete
                    </span>
                  )}
              </div>
            </div>
            
          </div>

          <div className="text-center">
             <p className="text-sm text-slate-400">
               Powered by Google Gemma-4B-IT • Served via FastAPI & PyTorch
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
