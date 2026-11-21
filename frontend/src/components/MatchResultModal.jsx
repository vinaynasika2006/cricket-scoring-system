import React, { useState } from 'react';
import { Trophy, FileSpreadsheet, Download, RefreshCw, Award, Check } from 'lucide-react';
import { api } from '../services/api';

export default function MatchResultModal({ isOpen, liveState, onViewScorecard, onStartNewMatch }) {
  if (!isOpen || !liveState) return null;

  const { match, result } = liveState;
  const [selectedPotm, setSelectedPotm] = useState(match?.player_of_the_match_id || '');
  const [potmSaved, setPotmSaved] = useState(false);

  // Combine players from both teams for Player of the Match selection
  const allPlayers = [
    ...(liveState.eligible_bowlers || []),
    ...(liveState.replayed?.batsman_stats || [])
  ];

  const handleSavePotm = async () => {
    if (!selectedPotm) return;
    try {
      await api.setPlayerOfMatch(match.id, selectedPotm);
      setPotmSaved(true);
      setTimeout(() => setPotmSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const pdfUrl = api.getPdfUrl(match.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-emerald-500/50 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden text-center relative">
        
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="pt-8 pb-4 px-6 relative z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-3xl shadow-xl shadow-amber-950/40 mb-3 animate-bounce">
            🏆
          </div>
          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
            MATCH COMPLETED
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-3 uppercase font-scoreboard">
            {result?.summary || match?.result_summary || 'Match Concluded'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{match?.title} • {match?.format} Format</p>
        </div>

        {/* Both Scores Summary Card */}
        <div className="mx-6 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl grid grid-cols-2 gap-4 relative z-10">
          <div className="border-r border-slate-800 pr-2">
            <div className="text-xs font-semibold text-slate-400 truncate uppercase">{liveState.bowling_team?.name}</div>
            <div className="text-2xl font-black text-white font-scoreboard mt-1">
              {/* In 2nd innings live state, bowling_team is the team that batted first */}
              {liveState.innings?.target ? liveState.innings.target - 1 : liveState.replayed?.total_runs}
            </div>
            <div className="text-[11px] text-slate-500">{match?.total_overs} Overs</div>
          </div>

          <div className="pl-2">
            <div className="text-xs font-semibold text-slate-400 truncate uppercase">{liveState.batting_team?.name}</div>
            <div className="text-2xl font-black text-emerald-400 font-scoreboard mt-1">
              {liveState.replayed?.total_runs}/{liveState.replayed?.total_wickets}
            </div>
            <div className="text-[11px] text-slate-500">{liveState.replayed?.overs_str} Overs</div>
          </div>
        </div>

        {/* Player of the Match manual selector (Section 15) */}
        <div className="mx-6 my-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-left relative z-10">
          <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>Player of the Match Award</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedPotm}
              onChange={(e) => setSelectedPotm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">-- Select Player of the Match --</option>
              {allPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleSavePotm}
              disabled={!selectedPotm}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all active:scale-95 whitespace-nowrap"
            >
              {potmSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>

        {/* Action Buttons (Section 15) */}
        <div className="p-6 bg-slate-900/90 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          <button
            onClick={onViewScorecard}
            className="flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Full Scorecard</span>
          </button>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Download PDF</span>
          </a>

          <button
            onClick={onStartNewMatch}
            className="flex items-center justify-center gap-1.5 py-3 px-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New Match</span>
          </button>
        </div>

      </div>
    </div>
  );
}
