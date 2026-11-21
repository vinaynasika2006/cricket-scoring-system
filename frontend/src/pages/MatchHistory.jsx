import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Trash2, Play, FileText, Download, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function MatchHistory({ onResumeMatch, onViewScorecard }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'in_progress', 'completed'

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await api.getMatches();
      setMatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [matchToDelete, setMatchToDelete] = useState(null);

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

  const filteredMatches = matches.filter(m => {
    if (filter === 'in_progress') return m.status === 'in_progress' || m.status === 'innings_break';
    if (filter === 'completed') return m.status === 'completed';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>Match Archives & Storage</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted in SQLite. Resume unfinished matches or review historical scorecards.
          </p>
        </div>

        {/* Filter Pill */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Matches' },
            { id: 'in_progress', label: 'Live' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400">Loading stored matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
          No matches found under this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((m) => {
            const isCompleted = m.status === 'completed';
            const pdfUrl = api.getPdfUrl(m.id);

            return (
              <div
                key={m.id}
                className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {m.format} • {m.total_overs} Overs
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      isCompleted ? 'bg-blue-950 text-blue-300' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-wide">
                    {m.team1_name} <span className="text-slate-500">vs</span> {m.team2_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{m.title}</p>

                  <div className="mt-3 text-xs font-semibold text-emerald-400">
                    {m.result_summary || "Match in progress..."}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMatchToDelete(m);
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete Match"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {isCompleted ? (
                      <>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => onViewScorecard(m.id)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors"
                        >
                          View Card
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onResumeMatch(m.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Resume</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              Are you sure you want to permanently delete <strong className="text-white">{matchToDelete.team1_name} vs {matchToDelete.team2_name}</strong> ({matchToDelete.title})? All deliveries, wickets, and scorecards will be permanently wiped.
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
