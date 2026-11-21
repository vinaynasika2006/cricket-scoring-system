import React, { useState } from 'react';
import { Sliders, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function ManualCorrectionModal({ isOpen, onClose, liveState, onRefresh }) {
  if (!isOpen || !liveState) return null;

  const { match, innings, replayed } = liveState;

  const [activeSubTab, setActiveSubTab] = useState('score'); // 'score', 'extras', 'strike'
  const [targetRuns, setTargetRuns] = useState(replayed.total_runs);
  const [targetWickets, setTargetWickets] = useState(replayed.total_wickets);
  const [reason, setReason] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Extras state
  const [byes, setByes] = useState(replayed.extras?.byes || 0);
  const [legByes, setLegByes] = useState(replayed.extras?.leg_byes || 0);
  const [wides, setWides] = useState(replayed.extras?.wides || 0);
  const [noBalls, setNoBalls] = useState(replayed.extras?.no_balls || 0);
  const [penalty, setPenalty] = useState(replayed.extras?.penalty || 0);

  const handleApplyScoreOverride = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide an audit reason for manual score correction.");
      return;
    }

    try {
      await api.applyManualCorrection(match.id, {
        target_type: 'score',
        target_id: innings.id,
        field_name: 'total_runs_wickets',
        new_value: { runs: targetRuns, wickets: targetWickets },
        reason: reason.trim()
      });

      setStatusMsg("Manual correction applied to audit log successfully.");
      setTimeout(() => {
        setStatusMsg("");
        onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApplyExtrasOverride = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide an audit reason for extras adjustment.");
      return;
    }

    try {
      await api.applyManualCorrection(match.id, {
        target_type: 'extras',
        target_id: innings.id,
        field_name: 'extras_breakdown',
        new_value: { byes, legByes, wides, noBalls, penalty },
        reason: reason.trim()
      });

      setStatusMsg("Extras adjustments recorded in audit log.");
      setTimeout(() => {
        setStatusMsg("");
        onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Manual Score Correction</h2>
              <p className="text-xs text-slate-400">Direct override with permanent audit trail</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveSubTab('score')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'score'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Team Score & Wickets
          </button>
          <button
            onClick={() => setActiveSubTab('extras')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === 'extras'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Extras Breakdown
          </button>
        </div>

        <div className="p-6 space-y-4">
          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {activeSubTab === 'score' && (
            <form onSubmit={handleApplyScoreOverride} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Total Team Runs</label>
                  <input
                    type="number"
                    value={targetRuns}
                    onChange={(e) => setTargetRuns(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-lg font-bold font-scoreboard text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Total Wickets</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={targetWickets}
                    onChange={(e) => setTargetWickets(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-lg font-bold font-scoreboard text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reason for Override (Audit Log)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Umpire overturned boundary decision"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
                >
                  Save Override & Log
                </button>
              </div>
            </form>
          )}

          {activeSubTab === 'extras' && (
            <form onSubmit={handleApplyExtrasOverride} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Byes (B)</label>
                  <input
                    type="number"
                    value={byes}
                    onChange={(e) => setByes(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Leg Byes (LB)</label>
                  <input
                    type="number"
                    value={legByes}
                    onChange={(e) => setLegByes(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Wides (WD)</label>
                  <input
                    type="number"
                    value={wides}
                    onChange={(e) => setWides(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">No Balls (NB)</label>
                  <input
                    type="number"
                    value={noBalls}
                    onChange={(e) => setNoBalls(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Penalty (PEN)</label>
                  <input
                    type="number"
                    value={penalty}
                    onChange={(e) => setPenalty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reason for Extras Correction</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scorer misclassified bye as wide"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
                >
                  Update Extras & Log
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
