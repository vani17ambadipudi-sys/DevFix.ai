import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DebugPage } from './pages/DebugPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { TransformerLabPage } from './pages/TransformerLabPage';
import { ProductionDashboardPage } from './pages/ProductionDashboardPage';
import { RepositoryDebuggerPage } from './pages/RepositoryDebuggerPage';
import { PredictiveDashboardPage } from './pages/PredictiveDashboardPage';
import { DebugSession } from './types';
import { storageService } from './services/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | 'debug'
    | 'repository'
    | 'transformer'
    | 'production'
    | 'predictive'
    | 'history'
    | 'about'
  >('debug');
  const [selectedSession, setSelectedSession] = useState<DebugSession | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(0);

  const refreshHistoryCount = () => {
    const sessions = storageService.getSessions();
    setHistoryCount(sessions.length);
  };

  useEffect(() => {
    refreshHistoryCount();

    // Check URL hash if present
    const hash = window.location.hash.replace('#', '');
    if (
      hash === 'history' ||
      hash === 'about' ||
      hash === 'debug' ||
      hash === 'repository' ||
      hash === 'predictive' ||
      hash === 'transformer' ||
      hash === 'production' ||
      hash === 'attention' ||
      hash === 'training'
    ) {
      if (hash === 'attention' || hash === 'training') {
        setActiveTab('transformer');
      } else {
        setActiveTab(hash as any);
      }
    }
  }, []);

  const handleTabChange = (
    tab:
      | 'debug'
      | 'repository'
      | 'transformer'
      | 'production'
      | 'predictive'
      | 'history'
      | 'about'
  ) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const handleOpenSession = (session: DebugSession) => {
    setSelectedSession(session);
    setActiveTab('debug');
    window.location.hash = 'debug';
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        historyCount={historyCount}
      />

      <main className="flex-1">
        {activeTab === 'debug' && (
          <DebugPage
            initialSession={selectedSession}
            onSessionSaved={refreshHistoryCount}
          />
        )}

        {activeTab === 'repository' && <RepositoryDebuggerPage />}

        {activeTab === 'predictive' && <PredictiveDashboardPage />}

        {activeTab === 'transformer' && <TransformerLabPage />}

        {activeTab === 'production' && <ProductionDashboardPage />}

        {activeTab === 'history' && (
          <HistoryPage
            onOpenSession={handleOpenSession}
            onRefreshCount={refreshHistoryCount}
          />
        )}

        {activeTab === 'about' && <AboutPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0d121f] py-6 mt-12 text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">DevFix AI</span>
            <span>•</span>
            <span className="text-indigo-400">Stage 10: Predictive Software Engineering</span>
          </div>

          <div className="text-slate-400">
            Repository Engineering &bull; Predictive Risk Intelligence &bull; Evidence Correlation &bull; Preventive Action
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTabChange('predictive')}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Predictive Ops
            </button>
            <span>•</span>
            <button
              onClick={() => handleTabChange('repository')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Repository Debugger
            </button>
            <span>•</span>
            <button
              onClick={() => handleTabChange('production')}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Telemetry
            </button>
            <span>•</span>
            <button
              onClick={() => handleTabChange('about')}
              className="hover:text-cyan-300 transition-colors"
            >
              Roadmap (1 &rarr; 10)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
