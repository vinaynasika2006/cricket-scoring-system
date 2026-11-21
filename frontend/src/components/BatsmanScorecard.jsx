import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';

export default function BatsmanScorecard({ batsmanStats, onUpdatePlayer }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (b) => {
    setEditingId(b.player_id);
    setEditForm({
      name: b.name,
      runs: b.runs,
      balls_faced: b.balls_faced,
      fours: b.fours,
      sixes: b.sixes,
      status: b.status,
      dismissal: b.dismissal
    });
  };

  const handleSave = () => {
    if (onUpdatePlayer && editingId) {
      onUpdatePlayer(editingId, editForm);
    }
    setEditingId(null);
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Batting Scorecard</span>
        </h3>
        <span className="text-[11px] text-slate-500">Live & Editable</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Batter</th>
              <th className="py-2.5 px-3">Status / Dismissal</th>
              <th className="py-2.5 px-2 text-right">R</th>
              <th className="py-2.5 px-2 text-right">B</th>
              <th className="py-2.5 px-2 text-right">4s</th>
              <th className="py-2.5 px-2 text-right">6s</th>
              <th className="py-2.5 px-3 text-right">SR</th>
              <th className="py-2.5 px-2 text-center w-10">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-scoreboard">
            {batsmanStats.map((b) => {
              const isEditing = editingId === b.player_id;
              const isCurrentBatting = b.status === 'batting';

              if (isEditing) {
                return (
                  <tr key={b.player_id} className="bg-slate-800/60">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-28"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={editForm.dismissal}
                        onChange={(e) => setEditForm({ ...editForm, dismissal: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-40"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.runs}
                        onChange={(e) => setEditForm({ ...editForm, runs: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-14 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.balls_faced}
                        onChange={(e) => setEditForm({ ...editForm, balls_faced: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-14 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.fours}
                        onChange={(e) => setEditForm({ ...editForm, fours: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-12 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={editForm.sixes}
                        onChange={(e) => setEditForm({ ...editForm, sixes: parseInt(e.target.value) || 0 })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white w-12 text-right"
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-slate-400">-</td>
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
                <tr
                  key={b.player_id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isCurrentBatting ? 'bg-emerald-950/20 font-semibold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium text-white flex items-center gap-1.5">
                    <span className="truncate max-w-[140px]">{b.name}</span>
                    {isCurrentBatting && <span className="text-emerald-400 font-bold">*</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-400 capitalize">
                    {b.dismissal !== 'not out' ? (
                      <span className="text-red-300/90">{b.dismissal}</span>
                    ) : (
                      <span className={isCurrentBatting ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                        {isCurrentBatting ? 'batting' : 'not out'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-white text-base">{b.runs}</td>
                  <td className="py-2.5 px-2 text-right text-slate-300">{b.balls_faced}</td>
                  <td className="py-2.5 px-2 text-right text-slate-400">{b.fours}</td>
                  <td className="py-2.5 px-2 text-right text-slate-400">{b.sixes}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                    {b.strike_rate ? b.strike_rate.toFixed(1) : '0.0'}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      onClick={() => startEdit(b)}
                      className="p-1 text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                      title="Edit batter statistics"
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
