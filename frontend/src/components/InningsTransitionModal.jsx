import React, { useState } from 'react';
import { Play, Award, ArrowRight } from 'lucide-react';

export default function InningsTransitionModal({ isOpen, liveState, onStartSecondInnings }) {
  if (!isOpen || !liveState) return null;

  const { match, innings, batting_team, bowling_team, replayed } = liveState;

  // The new batting team is the previous bowling team!
  const newBattingPlayers = liveState.eligible_bowlers || [];
  // The new bowling team is the previous batting team!
  const newBowlingPlayers = replayed.batsman_stats || [];

  const [strikerId, setStrikerId] = useState(newBattingPlayers[0]?.player_id || '');
  const [nonStrikerId, setNonStrikerId] = useState(newBattingPlayers[1]?.player_id || '');
  const [bowlerId, setBowlerId] = useState(newBowlingPlayers[0]?.player_id || '');

  const target = replayed.total_runs + 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!strikerId || !nonStrikerId || !bowlerId) return;
    if (strikerId === nonStrikerId) {
      alert("Striker and Non-Striker must be different players.");
      return;
    }

    onStartSecondInnings({
      opening_striker_id: strikerId,
      opening_non_striker_id: nonStrikerId,
      opening_bowler_id: bowlerId
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 p-6 text-center border-b border-emerald-600/40">
          <span className="text-3xl">🏁</span>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mt-1">1st Innings Concluded</h2>
          <div className="text-3xl font-black text-emerald-300 font-scoreboard my-2">
            {batting_team?.name}: {replayed.total_runs}/{replayed.total_wickets}
          </div>
          <p className="text-xs text-emerald-100">
            {replayed.overs_str} Overs • Run Rate: {replayed.current_run_rate}
          </p>

          <div className="inline-block mt-3 px-4 py-1.5 bg-black/40 rounded-full border border-emerald-400/30">
            <span className="text-xs uppercase tracking-widest text-slate-300">Target for {bowling_team?.name}: </span>
            <strong className="text-amber-300 text-sm font-scoreboard ml-1">{target} Runs</strong>
          </div>
        </div>

        {/* 2nd Innings Openers Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Setup 2nd Innings: {bowling_team?.name} Chase</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Opening Striker *</label>
              <select
                value={strikerId}
                onChange={(e) => setStrikerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {newBattingPlayers.map((p) => (
                  <option key={p.player_id} value={p.player_id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Opening Non-Striker</label>
              <select
                value={nonStrikerId}
                onChange={(e) => setNonStrikerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {newBattingPlayers.map((p) => (
                  <option key={p.player_id} value={p.player_id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Opening Bowler ({batting_team?.name})</label>
            <select
              value={bowlerId}
              onChange={(e) => setBowlerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {newBowlingPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
          >
            <span>Start 2nd Innings & Chase</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
