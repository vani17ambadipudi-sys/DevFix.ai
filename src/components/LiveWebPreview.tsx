import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Terminal,
  Layers,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface LiveWebPreviewProps {
  code: string;
  language: string;
  autoRun?: boolean;
}

interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export const LiveWebPreview: React.FC<LiveWebPreviewProps> = ({
  code,
  language,
}) => {
  const [activeView, setActiveView] = useState<'preview' | 'console' | 'dom'>('preview');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [domElements, setDomElements] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate safe HTML bundle based on language
  const generateSrcDoc = (): string => {
    const lang = (language || '').toLowerCase();
    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    if (lang === 'html') {
      htmlContent = code;
    } else if (lang === 'css') {
      cssContent = code;
      htmlContent = `
        <div class="preview-container">
          <div class="hero-banner">
            <span class="hero-badge">Featured Component</span>
            <h1>Live CSS Sandbox</h1>
            <p>Styling applied directly to live rendered components.</p>
          </div>
          <div class="card-container">
            <h2 class="card-title">Card Title Sample</h2>
            <p class="card-desc">Interactive demonstration verifying flexbox, grid, and typography properties.</p>
            <button class="preview-btn">Interactive Button</button>
          </div>
        </div>
      `;
    } else if (lang === 'javascript' || lang === 'typescript') {
      jsContent = code;
      htmlContent = `
        <div style="font-family: system-ui, sans-serif; padding: 20px; color: #f8fafc;">
          <h2 style="margin-top: 0; color: #38bdf8;">JavaScript Execution Sandbox</h2>
          <p style="color: #94a3b8; font-size: 14px;">Interactive DOM components and event listeners:</p>
          <div style="display: flex; gap: 10px; align-items: center; margin: 15px 0;">
            <div id="counter-display" style="font-size: 24px; font-weight: bold; background: #1e293b; padding: 8px 16px; border-radius: 8px; border: 1px solid #334155;">0</div>
            <button id="increment-btn" style="background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600;">Increment (+)</button>
          </div>
          <div id="user-card" style="margin-top: 15px; padding: 12px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; font-size: 13px;">
            User Card Container
          </div>
          <div id="results-container" style="margin-top: 10px; color: #a5f3fc; font-family: monospace;"></div>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 16px;
              background-color: #0b0f17;
              color: #f1f5f9;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .preview-container { display: flex; flex-direction: column; gap: 16px; }
            .preview-btn {
              background: #0284c7;
              color: white;
              border: none;
              padding: 8px 14px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            }
            /* Injected Custom CSS */
            ${cssContent}
          </style>
          <script>
            // Intercept console.log and pass to parent
            (function() {
              const postMsg = (type, args) => {
                try {
                  const message = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                  window.parent.postMessage({ source: 'devfix-preview-console', type, message }, '*');
                } catch(e) {}
              };
              const origLog = console.log;
              const origWarn = console.warn;
              const origErr = console.error;
              console.log = function(...args) { postMsg('log', args); origLog.apply(console, args); };
              console.warn = function(...args) { postMsg('warn', args); origWarn.apply(console, args); };
              console.error = function(...args) { postMsg('error', args); origErr.apply(console, args); };
              window.onerror = function(msg, url, line) {
                postMsg('error', ['Uncaught Error: ' + msg + ' (Line ' + line + ')']);
              };
            })();
          </script>
        </head>
        <body>
          ${htmlContent}
          <script>
            try {
              ${jsContent}
            } catch (err) {
              console.error(err.name + ': ' + err.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleRefresh = () => {
    setConsoleLogs([]);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = generateSrcDoc();
    }
  };

  useEffect(() => {
    handleRefresh();

    // Extract tags from code for DOM inspector
    const tagMatches = code.match(/<([a-zA-Z0-9-]+)([^>]*)>/g) || [];
    const parsedTags = tagMatches.slice(0, 20).map((t) => t.replace(/</g, '').replace(/>/g, ''));
    setDomElements(parsedTags);

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.source === 'devfix-preview-console') {
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: e.data.type || 'log',
            message: e.data.message || '',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [code, language]);

  const deviceWidthMap = {
    desktop: 'w-full',
    tablet: 'max-w-[768px]',
    mobile: 'max-w-[375px]',
  };

  return (
    <div className="bg-[#0b0f17] border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl flex flex-col mt-4">
      {/* Header Toolbar */}
      <div className="bg-[#111726] px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Live Web Rendering &amp; DOM Sandbox ({language})
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#090d14] p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveView('preview')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
              activeView === 'preview'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3" />
            Rendered UI
          </button>
          <button
            type="button"
            onClick={() => setActiveView('console')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
              activeView === 'console'
                ? 'bg-amber-950 text-amber-300 border border-amber-700/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3 h-3" />
            Console ({consoleLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('dom')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
              activeView === 'dom'
                ? 'bg-purple-950 text-purple-300 border border-purple-700/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            DOM Inspector
          </button>
        </div>

        {/* Viewport Resizer & Refresh */}
        <div className="flex items-center gap-2">
          {activeView === 'preview' && (
            <div className="hidden sm:flex items-center gap-1 bg-[#090d14] p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDeviceView('desktop')}
                title="Desktop View (100%)"
                className={`p-1 rounded ${deviceView === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceView('tablet')}
                title="Tablet View (768px)"
                className={`p-1 rounded ${deviceView === 'tablet' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceView('mobile')}
                title="Mobile View (375px)"
                className={`p-1 rounded ${deviceView === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            title="Reload Preview Sandbox"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 bg-[#080c14] min-h-[260px] flex justify-center items-stretch">
        {activeView === 'preview' && (
          <div className={`w-full transition-all duration-200 flex justify-center`}>
            <div className={`w-full ${deviceWidthMap[deviceView]} bg-[#0f172a] rounded-lg border border-slate-800/80 overflow-hidden shadow-inner`}>
              <iframe
                ref={iframeRef}
                title="Web Technology Preview Sandbox"
                sandbox="allow-scripts allow-modals"
                srcDoc={generateSrcDoc()}
                className="w-full h-[320px] border-0 bg-[#0b0f17]"
              />
            </div>
          </div>
        )}

        {activeView === 'console' && (
          <div className="w-full bg-[#070b12] rounded-lg border border-slate-800 p-3 font-mono text-xs overflow-y-auto max-h-[320px] space-y-1.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-800">
              Browser Console Stream
            </div>
            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic py-4 text-center">
                No console messages emitted yet. Output from console.log/warn/error will appear here.
              </div>
            ) : (
              consoleLogs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-1.5 rounded ${
                    log.type === 'error'
                      ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                      : log.type === 'warn'
                      ? 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500'
                      : 'bg-slate-900/60 text-slate-200 border-l-2 border-cyan-500'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 select-none shrink-0">[{log.timestamp}]</span>
                  <span className="font-semibold uppercase text-[10px] shrink-0">{log.type}:</span>
                  <span className="whitespace-pre-wrap break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeView === 'dom' && (
          <div className="w-full bg-[#070b12] rounded-lg border border-slate-800 p-3 font-mono text-xs overflow-y-auto max-h-[320px]">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-800 mb-2">
              Detected HTML / DOM Elements Hierarchy
            </div>
            {domElements.length === 0 ? (
              <div className="text-slate-500 italic py-4 text-center">
                No HTML element tags detected in the current code buffer.
              </div>
            ) : (
              <div className="space-y-1">
                {domElements.map((el, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1 rounded hover:bg-slate-800/40">
                    <span className="text-[10px] text-slate-500 select-none">#{idx + 1}</span>
                    <span className="text-cyan-400">&lt;</span>
                    <span className="text-amber-300 font-semibold">{el}</span>
                    <span className="text-cyan-400">&gt;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
