import React, { useEffect, useState } from 'react';
import { PlusCircle, Activity, Trophy, History, ArrowRight, Play, Calendar, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ onStartNewMatch, onResumeMatch, onViewScorecard }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchToDelete, setMatchToDelete] = useState(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await api.getMatches();
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!matchToDelete) return;
    try {
      await api.deleteMatch(matchToDelete.id);
      setMatches(matches.filter(m => m.id !== matchToDelete.id));
      setMatchToDelete(null);
    } catch (err) {
      alert("Failed to delete match: " + (err.message || "Unknown error"));
    }
  };

  const activeMatches = matches.filter(m => m.status === 'in_progress' || m.status === 'innings_break');
  const recentMatches = matches.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#042f2e] via-[#064e3b] to-[#0f172a] border border-emerald-500/30 p-8 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider mb-4">
            <span>Official Laws of Cricket System</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Manual Cricket Scoring & Match Management
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
            Take complete manual control of live cricket scoring with a centralized deterministic rules engine, 11 dismissal options, strike management, and automated scorecard generation.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={onStartNewMatch}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-xl transition-transform active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Match</span>
            </button>
            {activeMatches.length > 0 && (
              <button
                onClick={() => onResumeMatch(activeMatches[0].id)}
                className="flex items-center gap-2 px-6 py-3.5 bg-slate-900/80 hover:bg-slate-850 text-emerald-400 font-bold text-sm rounded-xl border border-emerald-500/40 shadow-lg transition-colors"
              >
                <Play className="w-4 h-4 fill-emerald-400" />
                <span>Resume Live Match</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative graphic */}
        <div className="absolute -right-8 -bottom-10 opacity-20 text-[200px] pointer-events-none select-none">
          🏏
        </div>
      </div>

      {/* Active Matches Banner */}
      {activeMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Active Matches in Progress</span>
            </h2>
            <span className="text-xs text-slate-400">{activeMatches.length} Ongoing</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMatches.map((m) => (
              <div
                key={m.id}
                className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl p-5 shadow-lg flex items-center justify-between hover:border-emerald-400 transition-all"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    {m.format} • {m.total_overs} Overs
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {m.team1_name} <span className="text-slate-500">vs</span> {m.team2_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{m.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onResumeMatch(m.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl shadow transition-transform active:scale-95"
                  >
                    <span>Score Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMatchToDelete(m);
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/30"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Matches Played', val: matches.length, icon: Trophy, color: 'text-amber-400' },
          { label: 'Live Matches', val: activeMatches.length, icon: Activity, color: 'text-emerald-400' },
          { label: 'Completed Matches', val: matches.filter(m => m.status === 'completed').length, icon: History, color: 'text-blue-400' },
          { label: 'Engine Accuracy', val: '100% Laws', icon: Play, color: 'text-purple-400' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase">{stat.label}</span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-black text-white font-scoreboard">{stat.val}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Matches List */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span>Recent Matches</span>
          </h2>
          <span className="text-xs text-slate-400">Persistent SQLite Storage</span>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No cricket matches recorded yet. Click "Create New Match" to get started!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentMatches.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{m.team1_name} vs {m.team2_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                      {m.format}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 font-medium mt-0.5">
                    {m.result_summary || (m.status === 'in_progress' ? 'Match in progress...' : 'Innings break')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.status === 'completed' ? (
                    <button
                      onClick={() => onViewScorecard(m.id)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
                    >
                      View Scorecard
                    </button>
                  ) : (
                    <button
                      onClick={() => onResumeMatch(m.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMatchToDelete(m);
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-red-500/40 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Match Record</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{matchToDelete.team1_name} vs {matchToDelete.team2_name}</strong> ({matchToDelete.title})? All deliveries, wickets, and scorecards will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 transition-all active:scale-95"
              >
                Delete Match
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
