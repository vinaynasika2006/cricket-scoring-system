import React from 'react';
import { Trophy, Activity, FileSpreadsheet, History, Settings, PlusCircle, Smartphone } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentMatch, onInstallClick }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Trophy },
    { id: 'scoring', label: 'Live Scoring', icon: Activity, disabled: !currentMatch },
    { id: 'scorecard', label: 'Scorecard', icon: FileSpreadsheet, disabled: !currentMatch },
    { id: 'history', label: 'Match History', icon: History },
    { id: 'settings', label: 'Settings & Corrections', icon: Settings, disabled: !currentMatch },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0c1222]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:scale-105 transition-transform">
            <span className="text-xl">🏏</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white">CRICK<span className="text-emerald-400">PRO</span></span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">Manual Engine</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Laws of Cricket Scoring System</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : item.disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
            title="Install as App"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          {currentMatch && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-700/60 rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-medium truncate max-w-[140px]">{currentMatch.title}</span>
            </div>
          )}

          <button
            onClick={() => setActiveTab('setup')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-semibold text-xs rounded-lg shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Match</span>
          </button>
        </div>

      </div>
    </header>
  );
}
