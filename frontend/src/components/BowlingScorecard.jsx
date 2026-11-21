import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';

export default function BowlingScorecard({ bowlerStats, onUpdateBowler }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (bw) => {
    setEditingId(bw.player_id);
    setEditForm({
      name: bw.name,
      overs_str: bw.overs_str,
      maidens: bw.maidens,
      runs_conceded: bw.runs_conceded,
      wickets: bw.wickets,
      wides: bw.wides,
      no_balls: bw.no_balls
    });
  };

  const handleSave = () => {
    if (onUpdateBowler && editingId) {
      onUpdateBowler(editingId, editForm);
    }
    setEditingId(null);
  };

  // Only display bowlers who have bowled or were selected
  const activeBowlers = bowlerStats.filter(b => b.legal_balls > 0 || b.wides > 0 || b.no_balls > 0 || b.overs_str !== "0.0");
  const displayList = activeBowlers.length > 0 ? activeBowlers : bowlerStats.slice(0, 5);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Bowling Scorecard</span>
        </h3>
        <span className="text-[11px] text-slate-500">Live & Editable</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Bowler</th>
              <th className="py-2.5 px-2 text-right">O</th>
              <th className="py-2.5 px-2 text-right">M</th>
              <th className="py-2.5 px-2 text-right">R</th>
              <th className="py-2.5 px-2 text-right">W</th>
              <th className="py-2.5 px-2 text-right">ECON</th>
              <th className="py-2.5 px-2 text-right">WD</th>
              <th className="py-2.5 px-2 text-right">NB</th>
              <th className="py-2.5 px-2 text-center w-10">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-scoreboard">
            {displayList.map((bw) => {
              const isEditing = editingId === bw.player_id;

              if (isEditing) {
                return (
                  <tr key={bw.player_id} className="bg-slate-800/60">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-28"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="text"
                        value={editForm.overs_str}
                        onChange={(e) => setEditForm({ ...editForm, overs_str: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-12 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.maidens}
                        onChange={(e) => setEditForm({ ...editForm, maidens: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-10 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.runs_conceded}
                        onChange={(e) => setEditForm({ ...editForm, runs_conceded: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-12 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.wickets}
                        onChange={(e) => setEditForm({ ...editForm, wickets: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-10 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400">-</td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.wides}
                        onChange={(e) => setEditForm({ ...editForm, wides: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-10 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.no_balls}
                        onChange={(e) => setEditForm({ ...editForm, no_balls: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-10 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={handleSave} className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={bw.player_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white truncate max-w-[140px]">{bw.name}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-slate-200">{bw.overs_str}</td>
                  <td className="py-2.5 px-2 text-right text-slate-400">{bw.maidens}</td>
                  <td className="py-2.5 px-2 text-right text-slate-200">{bw.runs_conceded}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-emerald-400 text-base">{bw.wickets}</td>
                  <td className="py-2.5 px-2 text-right text-slate-300 font-medium">
                    {bw.economy ? bw.economy.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-blue-300">{bw.wides}</td>
                  <td className="py-2.5 px-2 text-right text-orange-300">{bw.no_balls}</td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      onClick={() => startEdit(bw)}
                      className="p-1 text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                      title="Edit bowler figures"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
