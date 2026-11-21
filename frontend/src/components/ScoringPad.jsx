import React, { useState } from 'react';
import { Undo2, AlertCircle, PlusCircle, HelpCircle } from 'lucide-react';

export default function ScoringPad({
  onScoreDelivery,
  onOpenWicket,
  onOpenPenalty,
  onOpenBowlerSelect,
  onUndo,
  disabled,
  needsBowler
}) {
  const [activeTab, setActiveTab] = useState('normal'); // 'normal', 'wide', 'no_ball', 'byes', 'leg_byes'

  const handleDeliveryClick = (payload) => {
    if (needsBowler) {
      if (onOpenBowlerSelect) onOpenBowlerSelect();
      return;
    }
    onScoreDelivery(payload);
  };

  const handleWicketClick = () => {
    if (needsBowler) {
      if (onOpenBowlerSelect) onOpenBowlerSelect();
      return;
    }
    onOpenWicket();
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 relative">
      
      {/* Over Complete Banner / Prompt if bowler needed */}
      {needsBowler && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              Over complete! Select the bowler for the next over to continue scoring.
            </span>
          </div>
          <button
            onClick={onOpenBowlerSelect}
            className="w-full sm:w-auto px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-transform active:scale-95 shadow-md whitespace-nowrap"
          >
            Select Next Bowler
          </button>
        </div>
      )}

      {/* Category Selection Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { id: 'normal', label: '🏏 Normal Runs', color: 'hover:border-emerald-500' },
            { id: 'wide', label: 'WD Wide', color: 'hover:border-blue-500' },
            { id: 'no_ball', label: 'NB No Ball', color: 'hover:border-orange-500' },
            { id: 'byes', label: 'B Byes', color: 'hover:border-purple-500' },
            { id: 'leg_byes', label: 'LB Leg Byes', color: 'hover:border-cyan-500' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white border-emerald-400 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 ' + tab.color
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Undo Button */}
        <button
          onClick={onUndo}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-400/50 shadow-sm transition-all active:scale-95 whitespace-nowrap"
          title="Undo last delivery"
        >
          <Undo2 className="w-4 h-4" />
          <span>Undo Ball</span>
        </button>
      </div>

      {/* Button Grids depending on activeTab */}
      <div className="my-5">
        
        {/* TAB: NORMAL DELIVERIES */}
        {activeTab === 'normal' && (
          <div>
            <div className="text-xs text-slate-400 mb-3 font-medium flex items-center justify-between">
              <span>Runs scored off the bat:</span>
              <span className="text-[11px] text-slate-500">Counts 1 legal delivery</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
              {[
                { r: 0, label: '0', sub: 'Dot Ball', cls: 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700' },
                { r: 1, label: '1', sub: 'Single', cls: 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700' },
                { r: 2, label: '2', sub: 'Two', cls: 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700' },
                { r: 3, label: '3', sub: 'Three', cls: 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700' },
                { r: 4, label: '4', sub: 'FOUR', cls: 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-lg shadow-emerald-950/40' },
                { r: 5, label: '5', sub: 'Five', cls: 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700' },
                { r: 6, label: '6', sub: 'SIX', cls: 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-950/40' },
              ].map((btn) => (
                <button
                  key={btn.r}
                  disabled={disabled}
                  onClick={() => handleDeliveryClick({ delivery_type: 'normal', bat_runs: btn.r, extra_runs: 0 })}
                  className={`flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 rounded-xl border text-xl sm:text-2xl font-bold font-scoreboard transition-transform active:scale-95 ${btn.cls}`}
                >
                  <span>{btn.label}</span>
                  <span className="text-[10px] font-normal tracking-wide opacity-80 mt-0.5">{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: WIDE */}
        {activeTab === 'wide' && (
          <div>
            <div className="text-xs text-blue-400 mb-3 font-medium flex items-center justify-between">
              <span>Wide + completed runs / boundary extras (Charged to bowler, not legal ball):</span>
              <span className="text-[11px] text-slate-500">1 Penalty + Ran Runs</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
              {[
                { add: 0, label: 'WD', sub: '1 Run' },
                { add: 1, label: 'WD+1', sub: '2 Runs' },
                { add: 2, label: 'WD+2', sub: '3 Runs' },
                { add: 3, label: 'WD+3', sub: '4 Runs' },
                { add: 4, label: 'WD+4', sub: '5 Runs (4 Byes)' },
                { add: 5, label: 'WD+5', sub: '6 Runs' },
                { add: 6, label: 'WD+6', sub: '7 Runs' },
              ].map((btn) => (
                <button
                  key={btn.add}
                  disabled={disabled}
                  onClick={() => handleDeliveryClick({ delivery_type: 'wide', bat_runs: 0, extra_runs: btn.add })}
                  className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border bg-blue-950/40 hover:bg-blue-900/60 border-blue-700/60 text-blue-200 text-base sm:text-lg font-bold font-scoreboard transition-transform active:scale-95 shadow-sm"
                >
                  <span>{btn.label}</span>
                  <span className="text-[10px] text-blue-300/80 font-normal mt-0.5">{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: NO BALL */}
        {activeTab === 'no_ball' && (
          <div>
            <div className="text-xs text-orange-400 mb-3 font-medium flex items-center justify-between">
              <span>No Ball + runs off the bat (1 Penalty charged + bat runs, triggers Free Hit):</span>
              <span className="text-[11px] text-slate-500">Free-hit follows</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
              {[
                { r: 0, label: 'NB+0', sub: '1 Run' },
                { r: 1, label: 'NB+1', sub: '2 Runs' },
                { r: 2, label: 'NB+2', sub: '3 Runs' },
                { r: 3, label: 'NB+3', sub: '4 Runs' },
                { r: 4, label: 'NB+4', sub: '5 Runs (4 Bat)' },
                { r: 5, label: 'NB+5', sub: '6 Runs' },
                { r: 6, label: 'NB+6', sub: '7 Runs (6 Bat)' },
              ].map((btn) => (
                <button
                  key={btn.r}
                  disabled={disabled}
                  onClick={() => handleDeliveryClick({ delivery_type: 'no_ball', bat_runs: btn.r, extra_runs: 0 })}
                  className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border bg-orange-950/40 hover:bg-orange-900/60 border-orange-700/60 text-orange-200 text-base sm:text-lg font-bold font-scoreboard transition-transform active:scale-95 shadow-sm"
                >
                  <span>{btn.label}</span>
                  <span className="text-[10px] text-orange-300/80 font-normal mt-0.5">{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: BYES */}
        {activeTab === 'byes' && (
          <div>
            <div className="text-xs text-purple-400 mb-3 font-medium flex items-center justify-between">
              <span>Byes (Counts legal delivery, not charged to bowler):</span>
              <span className="text-[11px] text-slate-500">Team Total Only</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { b: 1, label: 'Bye 1', sub: '1 Run' },
                { b: 2, label: 'Bye 2', sub: '2 Runs' },
                { b: 3, label: 'Bye 3', sub: '3 Runs' },
                { b: 4, label: 'Bye 4', sub: '4 Runs (Boundary)' },
              ].map((btn) => (
                <button
                  key={btn.b}
                  disabled={disabled}
                  onClick={() => handleDeliveryClick({ delivery_type: 'bye', bat_runs: 0, extra_runs: btn.b })}
                  className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border bg-purple-950/40 hover:bg-purple-900/60 border-purple-700/60 text-purple-200 text-base sm:text-lg font-bold font-scoreboard transition-transform active:scale-95 shadow-sm"
                >
                  <span>{btn.label}</span>
                  <span className="text-[10px] text-purple-300/80 font-normal mt-0.5">{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: LEG BYES */}
        {activeTab === 'leg_byes' && (
          <div>
            <div className="text-xs text-cyan-400 mb-3 font-medium flex items-center justify-between">
              <span>Leg Byes (Counts legal delivery, not charged to bowler):</span>
              <span className="text-[11px] text-slate-500">Team Total Only</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { lb: 1, label: 'Leg Bye 1', sub: '1 Run' },
                { lb: 2, label: 'Leg Bye 2', sub: '2 Runs' },
                { lb: 3, label: 'Leg Bye 3', sub: '3 Runs' },
                { lb: 4, label: 'Leg Bye 4', sub: '4 Runs (Boundary)' },
              ].map((btn) => (
                <button
                  key={btn.lb}
                  disabled={disabled}
                  onClick={() => handleDeliveryClick({ delivery_type: 'leg_bye', bat_runs: 0, extra_runs: btn.lb })}
                  className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-700/60 text-cyan-200 text-base sm:text-lg font-bold font-scoreboard transition-transform active:scale-95 shadow-sm"
                >
                  <span>{btn.label}</span>
                  <span className="text-[10px] text-cyan-300/80 font-normal mt-0.5">{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Dedicated Primary Actions Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
        
        {/* Prominent Dedicated WICKET Button (Section 4 & 7) */}
        <button
          onClick={handleWicketClick}
          disabled={disabled}
          className="w-full py-4 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-lg sm:text-xl tracking-wider uppercase rounded-xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-transform active:scale-98 border border-red-400/30"
        >
          <span className="text-2xl">☝️</span>
          <span>WICKET / OUT</span>
        </button>

        {/* Penalty Runs & Extras Modal Trigger */}
        <button
          onClick={onOpenPenalty}
          disabled={disabled}
          className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm sm:text-base rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <span>Award Penalty Runs (5 Runs)</span>
        </button>

      </div>

    </div>
  );
}
