import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import MatchSetup from './pages/MatchSetup';
import LiveScoring from './pages/LiveScoring';
import FullScorecard from './pages/FullScorecard';
import MatchHistory from './pages/MatchHistory';
import MatchSettings from './pages/MatchSettings';
import { api } from './services/api';
import { Smartphone, Download, Share2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('crick_active_tab') || 'dashboard';
  });

  const [currentMatchId, setCurrentMatchId] = useState(() => {
    return localStorage.getItem('crick_active_match_id') || null;
  });

  const [currentMatch, setCurrentMatch] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('crick_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentMatchId) {
      localStorage.setItem('crick_active_match_id', currentMatchId);
      loadCurrentMatch(currentMatchId);
    }
  }, [currentMatchId]);

  const loadCurrentMatch = async (matchId) => {
    try {
      const data = await api.getMatch(matchId);
      setCurrentMatch(data.match);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMatchCreated = (matchId) => {
    setCurrentMatchId(matchId);
    setActiveTab('scoring');
  };

  const handleResumeMatch = (matchId) => {
    setCurrentMatchId(matchId);
    setActiveTab('scoring');
  };

  const handleViewScorecard = (matchId) => {
    setCurrentMatchId(matchId);
    setActiveTab('scorecard');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentMatch={currentMatch}
        onInstallClick={handleInstallClick}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <Dashboard
            onStartNewMatch={() => setActiveTab('setup')}
            onResumeMatch={handleResumeMatch}
            onViewScorecard={handleViewScorecard}
          />
        )}

        {activeTab === 'setup' && (
          <MatchSetup
            onMatchCreated={handleMatchCreated}
          />
        )}

        {activeTab === 'scoring' && currentMatchId && (
          <LiveScoring
            matchId={currentMatchId}
            onNavigateTab={setActiveTab}
            onStartNewMatch={() => setActiveTab('setup')}
          />
        )}

        {activeTab === 'scorecard' && currentMatchId && (
          <FullScorecard
            matchId={currentMatchId}
            onBack={() => setActiveTab('scoring')}
          />
        )}

        {activeTab === 'history' && (
          <MatchHistory
            onResumeMatch={handleResumeMatch}
            onViewScorecard={handleViewScorecard}
          />
        )}

        {activeTab === 'settings' && currentMatchId && (
          <MatchSettings
            matchId={currentMatchId}
            onBack={() => setActiveTab('scoring')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#080d19] py-4 text-center text-xs text-slate-500">
        <p>Complete Manual Cricket Scoring & Scorecard System • Compliant with Laws of Cricket</p>
      </footer>

      {/* Install App Modal for Mobile & PC */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-950/50">
                  🏏
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install CrickPro App</h3>
                  <p className="text-xs text-slate-400">Install directly onto your Home Screen / PC</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>On Android (Chrome / Brave / Edge)</span>
                </div>
                <p className="text-slate-300">
                  1. Tap the three dots menu (<strong className="text-white">⋮</strong>) at the top right.<br/>
                  2. Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.<br/>
                  3. The app icon will appear on your phone's home screen and run full-screen!
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-blue-400 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  <span>On iPhone / iPad (Safari)</span>
                </div>
                <p className="text-slate-300">
                  1. Tap the <strong className="text-white">Share</strong> button (box with upward arrow <strong className="text-white">⎋</strong>) at the bottom.<br/>
                  2. Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>.<br/>
                  3. Tap <strong className="text-white">Add</strong> in the top right corner.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-purple-400 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>On Windows / Mac (Chrome / Edge)</span>
                </div>
                <p className="text-slate-300">
                  Click the <strong className="text-white">Install</strong> icon in the right side of the browser URL address bar to install CrickPro as a standalone desktop application.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all active:scale-95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
