import React from 'react';
import { Zap, ShieldAlert, Award, ArrowRightLeft } from 'lucide-react';

export default function Scoreboard({ liveState, onSwapStrike, onSelectBowler, onSelectBatter }) {
  if (!liveState) return null;

  const { match, innings, batting_team, bowling_team, replayed, striker, non_striker, bowler } = liveState;
  const isSecondInnings = innings.innings_number === 2;
  const freeHitActive = replayed.free_hit_active;

  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#0b1120] border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 relative overflow-hidden">
      
      {/* Decorative turf line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-600"></div>

      {/* Free Hit Alert Banner */}
      {freeHitActive && (
        <div className="mb-4 bg-gradient-to-r from-orange-600 to-amber-600 free-hit-pulse text-white px-4 py-2 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 fill-white animate-bounce" />
            <span className="font-extrabold uppercase tracking-wider text-sm sm:text-base">FREE HIT DELIVERY!</span>
          </div>
          <span className="text-xs bg-black/30 px-2.5 py-1 rounded-full font-medium">
            Only Run Out & Obstruction Allowed
          </span>
        </div>
      )}

      {/* Header: Teams & Match Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
              {batting_team?.name}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Batting
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            vs <span className="text-slate-200 font-semibold">{bowling_team?.name}</span> • {match?.format} ({match?.total_overs} Overs)
          </p>
        </div>

        {/* 2nd innings chase tracker */}
        {isSecondInnings && (
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 px-4 py-2 rounded-xl">
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-semibold">Target</div>
              <div className="text-lg font-bold text-amber-400 font-scoreboard">{replayed.target}</div>
            </div>
            <div className="h-7 w-[1px] bg-slate-700"></div>
            <div className="text-left">
              <div className="text-xs text-slate-400 uppercase font-semibold">Need</div>
              <div className="text-sm font-semibold text-emerald-300">
                <span className="text-white font-bold font-scoreboard">{replayed.runs_required}</span> runs in <span className="text-white font-bold font-scoreboard">{Math.floor((replayed.balls_remaining || 0) / 6)}.{(replayed.balls_remaining || 0) % 6}</span> ov
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Score & Rates Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-center">
        
        {/* Score & Overs */}
        <div className="lg:col-span-5 flex items-baseline gap-4">
          <div className="text-5xl sm:text-7xl font-black text-white font-scoreboard tracking-tight drop-shadow-md">
            {replayed.total_runs}<span className="text-emerald-500">/</span>{replayed.total_wickets}
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-200 font-scoreboard">
              {replayed.overs_str} <span className="text-sm font-medium text-slate-400">Ovs</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Max {match?.total_overs} Overs
            </div>
          </div>
        </div>

        {/* Run Rates Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">CRR</div>
            <div className="text-xl font-bold text-emerald-400 font-scoreboard">
              {replayed.current_run_rate}
            </div>
          </div>
          {isSecondInnings ? (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">RRR</div>
              <div className="text-xl font-bold text-amber-400 font-scoreboard">
                {replayed.required_run_rate}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Proj. Score</div>
              <div className="text-xl font-bold text-slate-300 font-scoreboard">
                {replayed.legal_balls > 0 ? Math.round(replayed.current_run_rate * match?.total_overs) : '-'}
              </div>
            </div>
          )}
        </div>

        {/* Recent Balls Strip (Section 3 requirement) */}
        <div className="lg:col-span-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Last 6 Deliveries</span>
            <span className="text-[10px] text-slate-500">This Over</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {replayed.recent_balls && replayed.recent_balls.length > 0 ? (
              replayed.recent_balls.map((b, idx) => {
                let badgeClass = "bg-slate-800 text-slate-200 border-slate-700";
                if (b.is_wicket) badgeClass = "bg-red-600/90 text-white border-red-500 font-black animate-pulse";
                else if (b.runs === 4) badgeClass = "bg-emerald-600/90 text-white border-emerald-400 font-bold";
                else if (b.runs >= 6) badgeClass = "bg-amber-500/90 text-slate-950 border-amber-300 font-black";
                else if (b.delivery_type === 'wide') badgeClass = "bg-blue-600/80 text-white border-blue-400 font-semibold";
                else if (b.delivery_type === 'no_ball') badgeClass = "bg-orange-600/80 text-white border-orange-400 font-semibold";

                return (
                  <div
                    key={idx}
                    className={`min-w-8 h-8 px-2 rounded-lg border flex items-center justify-center text-xs font-scoreboard shadow-sm ${badgeClass}`}
                  >
                    {b.label}
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 italic">Over starting...</span>
            )}
          </div>
        </div>

      </div>

      {/* Active On-Field Players Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
        
        {/* Striker */}
        <div className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-xl p-3 relative shadow-md">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-sm">🏏 Striker *</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">SR: {striker?.strike_rate || 0}</span>
              {onSelectBatter && (
                <button
                  onClick={() => onSelectBatter(true)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium transition-colors"
                >
                  Change
                </button>
              )}
            </div>
          </div>
          <div className="text-base font-bold text-white truncate">{striker?.name || 'Select Striker'}</div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-300">
            <span className="text-emerald-300 font-bold font-scoreboard text-lg">{striker?.runs || 0}</span>
            <span className="text-xs text-slate-400 font-medium font-scoreboard">({striker?.balls_faced || 0} balls)</span>
            <span className="text-xs text-slate-400">4s: <strong className="text-white font-scoreboard">{striker?.fours || 0}</strong></span>
            <span className="text-xs text-slate-400">6s: <strong className="text-white font-scoreboard">{striker?.sixes || 0}</strong></span>
          </div>
        </div>

        {/* Non-Striker */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 font-medium text-sm">Non-Striker</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">SR: {non_striker?.strike_rate || 0}</span>
              {onSelectBatter && (
                <button
                  onClick={() => onSelectBatter(false)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Change
                </button>
              )}
            </div>
          </div>
          <div className="text-base font-bold text-slate-200 truncate">{non_striker?.name || 'Select Non-Striker'}</div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-300">
            <span className="text-slate-200 font-bold font-scoreboard text-lg">{non_striker?.runs || 0}</span>
            <span className="text-xs text-slate-400 font-medium font-scoreboard">({non_striker?.balls_faced || 0} balls)</span>
            <span className="text-xs text-slate-400">4s: <strong className="text-white font-scoreboard">{non_striker?.fours || 0}</strong></span>
            <span className="text-xs text-slate-400">6s: <strong className="text-white font-scoreboard">{non_striker?.sixes || 0}</strong></span>
          </div>
        </div>

        {/* Current Bowler */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 font-medium text-sm">Bowler</span>
            <button
              onClick={onSelectBowler}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium transition-colors"
            >
              Change
            </button>
          </div>
          <div className="text-base font-bold text-slate-200 truncate">{bowler?.name || 'Select Bowler'}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 font-scoreboard">
            <span>O: <strong className="text-white">{bowler?.overs_str || '0.0'}</strong></span>
            <span>M: <strong className="text-white">{bowler?.maidens || 0}</strong></span>
            <span>R: <strong className="text-white">{bowler?.runs_conceded || 0}</strong></span>
            <span>W: <strong className="text-emerald-400 text-sm">{bowler?.wickets || 0}</strong></span>
            <span className="text-slate-400 ml-auto">Econ: {bowler?.economy || 0}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
