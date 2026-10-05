import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Sparkles,
  Code2,
  FileCode,
  HelpCircle,
  Zap,
  Users,
  Terminal,
  Globe,
  Layers,
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { CODE_EXAMPLES } from '../data/examples';
import { LiveWebPreview } from './LiveWebPreview';

interface CodeEditorProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  code: string;
  setCode: (code: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  onDebugAndTest: (testExecution: boolean) => void;
  onClear: () => void;
  isAnalyzing: boolean;
  activeStep: string;
}

const LANGUAGES: SupportedLanguage[] = [
  'Python',
  'JavaScript',
  'HTML',
  'CSS',
  'TypeScript',
  'Java',
  'C',
  'C++',
  'SQL',
];

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  setLanguage,
  code,
  setCode,
  description,
  setDescription,
  onDebugAndTest,
  onClear,
  isAnalyzing,
  activeStep,
}) => {
  const [techCategory, setTechCategory] = useState<'all' | 'python' | 'javascript' | 'html' | 'css'>('all');
  const [showLiveWebPreview, setShowLiveWebPreview] = useState<boolean>(false);

  const lineCount = useMemo(() => {
    return Math.max(1, code.split('\n').length);
  }, [code]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  const isWebTechnology = ['HTML', 'CSS', 'JavaScript'].includes(language);
  const isExecutableLanguage = ['Python', 'JavaScript', 'TypeScript'].includes(language);

  const filteredExamples = useMemo(() => {
    if (techCategory === 'all') return CODE_EXAMPLES;
    if (techCategory === 'python') return CODE_EXAMPLES.filter((e) => e.language === 'Python');
    if (techCategory === 'javascript') return CODE_EXAMPLES.filter((e) => e.language === 'JavaScript');
    if (techCategory === 'html') return CODE_EXAMPLES.filter((e) => e.language === 'HTML');
    if (techCategory === 'css') return CODE_EXAMPLES.filter((e) => e.language === 'CSS');
    return CODE_EXAMPLES;
  }, [techCategory]);

  const loadExample = (exampleId: string) => {
    const snippet = CODE_EXAMPLES.find((e) => e.id === exampleId);
    if (snippet) {
      setLanguage(snippet.language as SupportedLanguage);
      setCode(snippet.code);
      if (snippet.userPrompt) {
        setDescription(snippet.userPrompt);
      }
      if (['HTML', 'CSS', 'JavaScript'].includes(snippet.language)) {
        setShowLiveWebPreview(true);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Language Selector & Technology Presets */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              Language:
            </label>
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value as SupportedLanguage;
                setLanguage(newLang);
                if (['HTML', 'CSS', 'JavaScript'].includes(newLang)) {
                  setShowLiveWebPreview(true);
                }
              }}
              disabled={isAnalyzing}
              className="bg-[#0b0f17] border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 font-mono transition-colors cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-[#0b0f17] text-slate-200">
                  {lang}
                </option>
              ))}
            </select>

            {isWebTechnology ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 hidden sm:inline-flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                Live Web Sandbox Ready
              </span>
            ) : isExecutableLanguage ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Subprocess Executable
              </span>
            ) : (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 hidden sm:inline-flex">
                Static Analysis Mode
              </span>
            )}
          </div>

          {/* Web Preview Toggle for HTML / CSS / JS */}
          {isWebTechnology && (
            <button
              type="button"
              onClick={() => setShowLiveWebPreview((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors border ${
                showLiveWebPreview
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showLiveWebPreview ? 'Hide Web Preview' : 'Show Web Preview'}</span>
            </button>
          )}
        </div>

        {/* Technology Preset Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Filter Tech:
            </span>
            {(['all', 'javascript', 'html', 'css', 'python'] as const).map((tech) => (
              <button
                key={tech}
                type="button"
                onClick={() => setTechCategory(tech)}
                className={`text-[11px] px-2 py-0.5 rounded font-mono uppercase tracking-wider transition-colors ${
                  techCategory === tech
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                {tech}
              </button>
            ))}
          </div>

          {/* Quick Example Snippets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {filteredExamples.slice(0, 5).map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => loadExample(ex.id)}
                disabled={isAnalyzing}
                className="text-xs px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 font-mono transition-colors truncate max-w-[150px]"
                title={`${ex.title} (${ex.language})`}
              >
                {ex.title.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code Editor Window */}
      <div className="bg-[#0b0f17] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col focus-within:border-cyan-500/50 transition-colors">
        {/* Editor Title Bar */}
        <div className="bg-[#121929] px-4 py-2.5 border-b border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
            </div>
            <span className="text-xs text-slate-400 font-mono ml-2 flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              source.{language.toLowerCase() === 'c++' ? 'cpp' : language.toLowerCase()}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {code.length} chars
          </div>
        </div>

        {/* Textarea with Line Numbers */}
        <div className="relative flex font-mono text-sm min-h-[300px] max-h-[500px] overflow-auto bg-[#090d14]">
          <div className="select-none bg-[#0c121e] text-slate-600 px-3 py-3 text-right text-xs border-r border-slate-800/60 font-mono shrink-0 min-w-[42px] leading-6">
            {lineNumbers.map((num) => (
              <div key={num} className="leading-6">
                {num}
              </div>
            ))}
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isAnalyzing}
            placeholder={`// Paste your ${language} source code here for multi-agent autonomous diagnosis...`}
            spellCheck={false}
            className="flex-1 bg-transparent text-slate-100 p-3 outline-none resize-none font-mono text-sm leading-6 selection:bg-cyan-500/20 whitespace-pre"
          />
        </div>

        {/* Optional Problem Description */}
        <div className="bg-[#111726] border-t border-slate-800/90 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Optional User Description / Bug Context:</span>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isAnalyzing}
            placeholder="e.g. Expected average to be 85, but output was NaN, or missing alt attributes in accessibility audit"
            className="w-full bg-[#090d14] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Live Web Sandbox Preview (if enabled and language is HTML/CSS/JS) */}
      {showLiveWebPreview && isWebTechnology && (
        <LiveWebPreview code={code} language={language} />
      )}

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111726] border border-slate-800 rounded-xl p-3.5 shadow-lg">
        <button
          type="button"
          onClick={onClear}
          disabled={isAnalyzing || (!code && !description)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <div className="flex items-center gap-2">
          {isExecutableLanguage && (
            <button
              type="button"
              onClick={() => onDebugAndTest(true)}
              disabled={isAnalyzing || !code.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-mono font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 disabled:opacity-50 transition-all cursor-pointer"
              title="Runs 5-agent pipeline with controlled subprocess execution & self-correction"
            >
              <Terminal className="w-4 h-4" />
              <span>Debug + Test Execution</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDebugAndTest(false)}
            disabled={isAnalyzing || !code.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-mono font-semibold rounded-lg bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-950/40 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>
              {isAnalyzing
                ? `Agents Working (${activeStep || 'Coordinating'})...`
                : isWebTechnology
                ? `Analyze Web Code (${language})`
                : 'Run Multi-Agent Debugger'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
