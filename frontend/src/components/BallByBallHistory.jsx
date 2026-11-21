import React, { useState } from 'react';
import { History, Edit3, Trash2, Check, X, AlertCircle } from 'lucide-react';

export default function BallByBallHistory({ liveState, onEditDelivery, onDeleteDelivery, onUndo }) {
  if (!liveState) return null;

  const { replayed, innings } = liveState;
  const oversBreakdown = replayed.overs_breakdown || {};
  const oversKeys = Object.keys(oversBreakdown).map(k => parseInt(k)).sort((a, b) => b - a); // latest over first

  const [editingDelivery, setEditingDelivery] = useState(null);
  const [editForm, setEditForm] = useState({ delivery_type: 'normal', bat_runs: 0, extra_runs: 0, notes: '' });

  const startEdit = (ballObj) => {
    setEditingDelivery(ballObj);
    setEditForm({
      delivery_type: ballObj.delivery_type || 'normal',
      bat_runs: ballObj.bat_runs || 0,
      extra_runs: ballObj.extra_runs || 0,
      notes: ballObj.notes || ''
    });
  };

  const handleSaveEdit = () => {
    if (editingDelivery && onEditDelivery) {
      onEditDelivery(editingDelivery.id, editForm);
    }
    setEditingDelivery(null);
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ball-By-Ball History</h3>
        </div>
        <span className="text-xs text-slate-400">Total Legal Balls: <strong className="text-white font-scoreboard">{replayed.legal_balls}</strong></span>
      </div>

      {oversKeys.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs italic">
          No deliveries bowled in this innings yet. Start scoring above!
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {oversKeys.map((ovNum) => {
            const overData = oversBreakdown[ovNum];
            const bowlerName = liveState.eligible_bowlers.find(b => b.player_id === overData.bowler_id)?.name || 'Bowler';

            return (
              <div key={ovNum} className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs font-scoreboard border border-emerald-500/30">
                      OVER {ovNum + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-300">{bowlerName}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-scoreboard">
                    Runs: <strong className="text-white">{overData.runs_conceded}</strong> • Legal Balls: {overData.legal_balls}/6
                  </div>
                </div>

                {/* Delivery Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {overData.balls.map((bLabel, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-scoreboard shadow-sm"
                    >
                      {bLabel}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Delivery Modal if triggered */}
      {editingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white uppercase mb-3">Edit Past Delivery</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={editForm.delivery_type}
                  onChange={(e) => setEditForm({ ...editForm, delivery_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                  <option value="no_ball">No Ball</option>
                  <option value="bye">Bye</option>
                  <option value="leg_bye">Leg Bye</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Bat Runs</label>
                <input
                  type="number"
                  value={editForm.bat_runs}
                  onChange={(e) => setEditForm({ ...editForm, bat_runs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Extra Runs</label>
                <input
                  type="number"
                  value={editForm.extra_runs}
                  onChange={(e) => setEditForm({ ...editForm, extra_runs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingDelivery(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
