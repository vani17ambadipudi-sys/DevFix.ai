import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  Code,
  Zap,
} from 'lucide-react';
import { DebuggingResult, FollowUpMessage, SupportedLanguage } from '../types';
import { geminiService } from '../services/geminiService';

interface FollowUpChatProps {
  language: SupportedLanguage;
  originalCode: string;
  description: string;
  debuggingResult: DebuggingResult;
  messages: FollowUpMessage[];
  setMessages: React.Dispatch<React.SetStateAction<FollowUpMessage[]>>;
}

const QUICK_PROMPTS = [
  'Why is this wrong?',
  'Explain this line.',
  'Give me another solution.',
  'Can you make it more efficient?',
];

export const FollowUpChat: React.FC<FollowUpChatProps> = ({
  language,
  originalCode,
  description,
  debuggingResult,
  messages,
  setMessages,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setError(null);
    const userMsg: FollowUpMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await geminiService.askFollowUp({
        language,
        originalCode,
        description,
        debuggingResult,
        question: textToSend.trim(),
        history: historyPayload,
      });

      const agentMsg: FollowUpMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error('Follow-up error:', err);
      setError(err?.message || 'Failed to get answer from DevFix Agent.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 shadow-xl mt-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-200">
              Ask DevFix Agent (Follow-up)
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Same senior tutor maintains code and analysis context
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 hidden sm:inline-block">
          Context Preserved
        </span>
      </div>

      {/* Quick Prompts Bar */}
      <div className="mt-3">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3 text-cyan-400" />
          Suggested Questions:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
              className="text-xs px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages stream */}
      {messages.length > 0 && (
        <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm p-3.5 rounded-xl border leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-800/60 border-slate-700/80 text-slate-100 ml-6'
                  : 'bg-[#0b0f17] border-slate-800 text-slate-200 mr-2 font-sans'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-1 font-mono text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {msg.role === 'user' ? 'You' : 'DevFix Agent'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-cyan-400 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <span>DevFix Agent is thinking...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono flex items-center gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder="Ask a follow-up question about this code or error..."
          className="flex-1 bg-[#0b0f17] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors font-sans"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </div>
  );
};
