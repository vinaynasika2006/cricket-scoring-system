import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Trophy, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function FullScorecard({ matchId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (matchId) {
      loadScorecard();
    }
  }, [matchId]);

  const loadScorecard = async () => {
    try {
      setLoading(true);
      setError('');
      const sc = await api.getScorecard(matchId);
      setData(sc);
    } catch (err) {
      setError(err.message || 'Failed to fetch scorecard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Generating official scorecard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-red-950/70 border border-red-700 rounded-3xl text-red-200">
          <p className="text-sm">{error || "Scorecard not found"}</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs">Go Back</button>
        </div>
      </div>
    );
  }

  const { match, innings, player_of_the_match } = data;
  const pdfUrl = api.getPdfUrl(match.id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scoring</span>
        </button>

        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </a>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Match Overview Header */}
      <div className="bg-gradient-to-b from-[#0f172a] to-[#080d1a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {match.format} • {match.total_overs} Overs Match
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight mt-3">
            {match.title}
          </h1>
          {match.result_summary && (
            <div className="mt-3 text-lg sm:text-xl font-bold text-emerald-400 font-scoreboard">
              🏆 {match.result_summary}
            </div>
          )}
          {player_of_the_match && (
            <div className="mt-2 text-xs text-amber-300 font-semibold flex items-center gap-1.5">
              <span>🌟 Player of the Match:</span>
              <strong className="text-white">{player_of_the_match}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Innings Scorecards */}
      {innings.map((inn) => {
        const ext = inn.extras;

        return (
          <div key={inn.innings_id} className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Innings Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                  Innings {inn.innings_number}: {inn.batting_team.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  vs {inn.bowling_team.name}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-scoreboard">
                  {inn.total_runs}/{inn.total_wickets}
                </div>
                <div className="text-xs text-slate-400 font-scoreboard">
                  {inn.overs} Overs • Run Rate: {inn.run_rate}
                </div>
              </div>
            </div>

            {/* BATTING TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Batter</th>
                    <th className="py-2.5 px-3">Dismissal</th>
                    <th className="py-2.5 px-3 text-right">R</th>
                    <th className="py-2.5 px-3 text-right">B</th>
                    <th className="py-2.5 px-3 text-right">4s</th>
                    <th className="py-2.5 px-3 text-right">6s</th>
                    <th className="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-scoreboard">
                  {inn.batting_card
                    .filter(b => b.status !== 'not_out' || b.balls_faced > 0)
                    .map((b) => (
                      <tr key={b.player_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">{b.name}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{b.dismissal}</td>
                        <td className="py-3 px-3 text-right font-bold text-white text-base">{b.runs}</td>
                        <td className="py-3 px-3 text-right text-slate-300">{b.balls_faced}</td>
                        <td className="py-3 px-3 text-right text-slate-400">{b.fours}</td>
                        <td className="py-3 px-3 text-right text-slate-400">{b.sixes}</td>
                        <td className="py-3 px-3 text-right text-slate-300 font-medium">
                          {b.strike_rate ? b.strike_rate.toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}

                  {/* Extras Row (Section 11) */}
                  <tr className="bg-slate-900/60 font-bold">
                    <td className="py-2.5 px-3 text-white">Extras</td>
                    <td className="py-2.5 px-3 text-xs font-normal text-slate-400">
                      (b {ext.byes}, lb {ext.leg_byes}, w {ext.wides}, nb {ext.no_balls}, pen {ext.penalty})
                    </td>
                    <td className="py-2.5 px-3 text-right text-white text-base">{ext.total}</td>
                    <td colSpan="4"></td>
                  </tr>

                  {/* Total Row */}
                  <tr className="bg-slate-900/90 font-black text-emerald-400 border-t border-slate-700">
                    <td className="py-3 px-3 text-white uppercase tracking-wider">Total</td>
                    <td className="py-3 px-3 text-xs font-normal text-slate-300">
                      ({inn.total_wickets} wickets, {inn.overs} overs)
                    </td>
                    <td className="py-3 px-3 text-right text-xl font-scoreboard">{inn.total_runs}</td>
                    <td colSpan="4"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Did not bat */}
            {inn.did_not_bat && inn.did_not_bat.length > 0 && (
              <div className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-300">Did Not Bat: </span>
                <span>{inn.did_not_bat.join(', ')}</span>
              </div>
            )}

            {/* Fall of Wickets (Section 12) */}
            {inn.fall_of_wickets && inn.fall_of_wickets.length > 0 && (
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Fall of Wickets
                </h3>
                <div className="flex flex-wrap gap-2 text-xs font-scoreboard">
                  {inn.fall_of_wickets.map((f, i) => (
                    <div key={i} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                      <strong className="text-white">{f.score}-{f.wicket_number}</strong> ({f.player_name}, {f.overs} ov)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BOWLING TABLE */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Bowling ({inn.bowling_team.name})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Bowler</th>
                      <th className="py-2.5 px-3 text-right">O</th>
                      <th className="py-2.5 px-3 text-right">M</th>
                      <th className="py-2.5 px-3 text-right">R</th>
                      <th className="py-2.5 px-3 text-right">W</th>
                      <th className="py-2.5 px-3 text-right">ECON</th>
                      <th className="py-2.5 px-3 text-right">WD</th>
                      <th className="py-2.5 px-3 text-right">NB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-scoreboard">
                    {inn.bowling_card
                      .filter(bw => bw.legal_balls > 0 || bw.wides > 0 || bw.no_balls > 0)
                      .map((bw) => (
                        <tr key={bw.player_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">{bw.name}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-200">{bw.overs_str}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">{bw.maidens}</td>
                          <td className="py-2.5 px-3 text-right text-slate-200">{bw.runs_conceded}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400 text-base">{bw.wickets}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {bw.economy ? bw.economy.toFixed(2) : '0.00'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-blue-300">{bw.wides}</td>
                          <td className="py-2.5 px-3 text-right text-orange-300">{bw.no_balls}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })}

    </div>
  );
}
