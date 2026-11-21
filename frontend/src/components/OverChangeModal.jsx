import React, { useState } from 'react';
import { User, AlertCircle, Check } from 'lucide-react';

export default function OverChangeModal({ isOpen, eligibleBowlers, previousBowlerId, onSelectBowler }) {
  if (!isOpen) return null;

  const [selectedId, setSelectedId] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">
            ⚾
          </div>
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Over Complete (6 Balls)</h2>
            <p className="text-xs text-slate-400">Select the next bowler to continue match</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 mb-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Laws of Cricket rule: A bowler cannot bowl two consecutive overs.</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto my-4 pr-1">
          {eligibleBowlers.map((bw) => {
            const isBlocked = bw.is_consecutive_blocked;
            const isSelected = selectedId === bw.player_id;

            return (
              <button
                key={bw.player_id}
                type="button"
                disabled={isBlocked}
                onClick={() => setSelectedId(bw.player_id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isBlocked
                    ? 'opacity-40 bg-slate-900/40 border-slate-800 cursor-not-allowed text-slate-500'
                    : isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{bw.name}</span>
                    {isBlocked && (
                      <span className="text-[10px] text-amber-400 font-normal px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        Bowled Last Over
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-scoreboard mt-0.5">
                    {bw.overs_str} ov • {bw.maidens} mdns • {bw.runs_conceded} runs • {bw.wickets} wkts
                  </div>
                </div>

                {isSelected && <Check className="w-5 h-5 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selectedId}
          onClick={() => onSelectBowler(selectedId)}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-98"
        >
          Confirm Bowler & Start Next Over
        </button>

      </div>
    </div>
  );
}
