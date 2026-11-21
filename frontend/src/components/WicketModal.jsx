import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, UserCheck, Shield } from 'lucide-react';

const DISMISSALS = [
  { id: 'bowled', label: '1. Bowled', creditedToBowler: true, allowsOnFreeHit: false, allowsOnWide: false },
  { id: 'caught', label: '2. Caught', creditedToBowler: true, allowsOnFreeHit: false, allowsOnWide: false },
  { id: 'lbw', label: '3. LBW', creditedToBowler: true, allowsOnFreeHit: false, allowsOnWide: false },
  { id: 'run_out', label: '4. Run Out', creditedToBowler: false, allowsOnFreeHit: true, allowsOnWide: true },
  { id: 'stumped', label: '5. Stumped', creditedToBowler: true, allowsOnFreeHit: false, allowsOnWide: true },
  { id: 'hit_wicket', label: '6. Hit Wicket', creditedToBowler: true, allowsOnFreeHit: false, allowsOnWide: false },
  { id: 'retired_out', label: '7. Retired Out', creditedToBowler: false, allowsOnFreeHit: true, allowsOnWide: true },
  { id: 'obstructing_field', label: '8. Obstructing the Field', creditedToBowler: false, allowsOnFreeHit: true, allowsOnWide: true },
  { id: 'hit_ball_twice', label: '9. Hit the Ball Twice', creditedToBowler: false, allowsOnFreeHit: true, allowsOnWide: false },
  { id: 'timed_out', label: '10. Timed Out', creditedToBowler: false, allowsOnFreeHit: true, allowsOnWide: true },
  { id: 'retired_hurt', label: '11. Retired Hurt (Not Out)', creditedToBowler: false, allowsOnFreeHit: true, allowsOnWide: true, isNotWicket: true },
];

export default function WicketModal({
  isOpen,
  onClose,
  liveState,
  onConfirmWicket
}) {
  if (!isOpen || !liveState) return null;

  const { replayed, striker, non_striker, bowler, bowling_team, eligible_bowlers, available_incoming } = liveState;
  const isFreeHit = replayed.free_hit_active;

  // State
  const [step, setStep] = useState('select'); // 'select', 'confirm', 'incoming'
  const [dismissalType, setDismissalType] = useState('bowled');
  const [playerOutId, setPlayerOutId] = useState(striker?.player_id || '');
  const [fielderId, setFielderId] = useState('');
  const [keeperId, setKeeperId] = useState('');
  const [isCaughtAndBowled, setIsCaughtAndBowled] = useState(false);
  const [runsCompleted, setRunsCompleted] = useState(0);
  const [deliveryType, setDeliveryType] = useState('normal'); // 'normal', 'wide', 'no_ball'
  const [selectedIncomingId, setSelectedIncomingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Bowling team fielders list
  const bowlingFielders = liveState.eligible_bowlers || [];
  // Find designated keeper
  const designatedKeeper = bowlingFielders.find(p => p.is_wicketkeeper) || bowlingFielders[0];

  const currentDismissalObj = DISMISSALS.find(d => d.id === dismissalType);

  // Filter available incoming batters to exclude:
  // 1. The batsman currently getting out (playerOutId)
  // 2. The other batsman who stays on the crease
  // 3. Anyone who is already dismissed ('out' or 'retired_out')
  const otherBatterId = playerOutId === striker?.player_id ? non_striker?.player_id : striker?.player_id;
  const incomingCandidates = (available_incoming || []).filter(b => 
    b.player_id !== playerOutId &&
    b.player_id !== otherBatterId &&
    b.status !== 'out' &&
    b.status !== 'retired_out'
  );

  const handleSelectPlayerOut = (id) => {
    setPlayerOutId(id);
    const otherId = id === striker?.player_id ? non_striker?.player_id : striker?.player_id;
    const valid = (available_incoming || []).filter(b => 
      b.player_id !== id && b.player_id !== otherId && b.status !== 'out' && b.status !== 'retired_out'
    );
    setSelectedIncomingId(valid[0]?.player_id || '');
  };

  // Sync state whenever modal opens or striker changes
  React.useEffect(() => {
    if (isOpen) {
      const outId = striker?.player_id || '';
      setPlayerOutId(outId);
      const otherId = non_striker?.player_id || '';
      const validCands = (available_incoming || []).filter(b => 
        b.player_id !== outId && b.player_id !== otherId && b.status !== 'out' && b.status !== 'retired_out'
      );
      setSelectedIncomingId(validCands[0]?.player_id || '');
      setStep('select');
      setDismissalType('bowled');
      setErrorMessage('');
    }
  }, [isOpen, striker?.player_id]);

  const handleProceedToConfirm = () => {
    setErrorMessage('');

    // Dismissal restriction checks
    if (isFreeHit && !currentDismissalObj?.allowsOnFreeHit) {
      setErrorMessage(`Rule Violation: Batsman cannot be dismissed '${currentDismissalObj?.label}' on a FREE HIT! Only Run Out, Obstructing, and Hit Twice are legal.`);
      return;
    }

    if (deliveryType === 'wide' && !currentDismissalObj?.allowsOnWide) {
      setErrorMessage(`Rule Violation: Batsman cannot be dismissed '${currentDismissalObj?.label}' on a Wide. Only Run Out, Stumped, and Obstructing are legal.`);
      return;
    }

    if (deliveryType === 'no_ball' && !currentDismissalObj?.allowsOnFreeHit) {
      setErrorMessage(`Rule Violation: Batsman cannot be dismissed '${currentDismissalObj?.label}' on a No Ball.`);
      return;
    }

    if (dismissalType === 'caught' && !isCaughtAndBowled && !fielderId) {
      setErrorMessage('Please select the fielder who took the catch.');
      return;
    }

    setStep('confirm');
  };

  const handleFinalConfirm = () => {
    const wicketsAfterThis = currentDismissalObj?.isNotWicket ? replayed.total_wickets : replayed.total_wickets + 1;
    const isAllOut = wicketsAfterThis >= 10 || incomingCandidates.length === 0;

    if (!isAllOut && incomingCandidates.length > 0) {
      if (!selectedIncomingId) {
        setSelectedIncomingId(incomingCandidates[0].player_id);
      }
      setStep('incoming');
    } else {
      submitWicket(null);
    }
  };

  const submitWicket = (incomingId) => {
    const nextId = incomingId || selectedIncomingId || (incomingCandidates.length > 0 ? incomingCandidates[0].player_id : null);
    const payload = {
      dismissal_type: dismissalType,
      player_out_id: playerOutId || striker?.player_id,
      bowler_id: bowler?.player_id,
      fielder_id: isCaughtAndBowled ? bowler?.player_id : (dismissalType === 'stumped' ? (keeperId || designatedKeeper?.player_id) : fielderId),
      wicketkeeper_id: dismissalType === 'stumped' ? (keeperId || designatedKeeper?.player_id) : null,
      runs_completed: runsCompleted,
      delivery_type: deliveryType,
      bat_runs: runsCompleted,
      extra_runs: 0,
      incoming_batsman_id: nextId
    };

    onConfirmWicket(payload);
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setStep('select');
    setDismissalType('bowled');
    setFielderId('');
    setErrorMessage('');
    onClose();
  };

  const dismissedPlayerName = playerOutId === non_striker?.player_id ? non_striker?.name : striker?.name;
  const catcherName = isCaughtAndBowled
    ? bowler?.name
    : bowlingFielders.find(f => f.player_id === fielderId)?.name || 'Fielder';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-900/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">☝️</span>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                {step === 'select' && 'Select Dismissal'}
                {step === 'confirm' && 'Confirm Wicket Details'}
                {step === 'incoming' && 'Select Incoming Batsman'}
              </h2>
              <p className="text-xs text-slate-400">Manual Wicket Decision & Verification</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-700/80 rounded-xl text-red-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Free Hit Alert */}
          {isFreeHit && (
            <div className="p-3 bg-amber-950/50 border border-amber-700 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Free Hit Active:</strong> Bowled, Caught, LBW, and Stumped are disallowed.</span>
            </div>
          )}

          {/* ================= STEP 1: SELECT DISMISSAL ================= */}
          {step === 'select' && (
            <>
              {/* Delivery Circumstance */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Delivery Condition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'Normal Ball' },
                    { id: 'wide', label: 'Wide Delivery' },
                    { id: 'no_ball', label: 'No Ball' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDeliveryType(d.id)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        deliveryType === d.id
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dismissed Batsman Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Dismissed Batsman (Choose who got out)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectPlayerOut(striker?.player_id || '')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      playerOutId === striker?.player_id
                        ? 'bg-red-500/20 border-red-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-medium text-emerald-400">Striker *</div>
                    <div className="text-sm font-bold text-white truncate">{striker?.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{striker?.runs || 0} ({striker?.balls_faced || 0} balls)</div>
                  </button>

                  {non_striker && non_striker.player_id !== striker?.player_id && (
                    <button
                      type="button"
                      onClick={() => handleSelectPlayerOut(non_striker?.player_id || '')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        playerOutId === non_striker?.player_id
                          ? 'bg-red-500/20 border-red-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-400">Non-Striker</div>
                      <div className="text-sm font-bold text-white truncate">{non_striker?.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{non_striker?.runs || 0} ({non_striker?.balls_faced || 0} balls)</div>
                    </button>
                  )}
                </div>
              </div>

              {/* 11 Dismissal Options (Section 7) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Dismissal Mode (11 Options)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DISMISSALS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDismissalType(d.id)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                        dismissalType === d.id
                          ? 'bg-red-600/30 border-red-500 text-white font-bold shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>{d.label}</div>
                      {d.isNotWicket && <span className="text-[10px] text-amber-400 font-normal">No wicket charged</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Fields for CAUGHT */}
              {dismissalType === 'caught' && (
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase">Catcher Selection</span>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCaughtAndBowled}
                        onChange={(e) => setIsCaughtAndBowled(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                      />
                      <span>Caught & Bowled ({bowler?.name})</span>
                    </label>
                  </div>

                  {!isCaughtAndBowled && (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Select Fielder from {bowling_team?.name}:</label>
                      <select
                        value={fielderId}
                        onChange={(e) => setFielderId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose Fielder --</option>
                        {bowlingFielders
                          .filter(f => f.player_id !== bowler?.player_id) // Exclude bowler from fielder list unless C&B
                          .map((f) => (
                            <option key={f.player_id} value={f.player_id}>{f.name}</option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="text-xs text-slate-400">
                    Bowler Credited: <strong className="text-white">{bowler?.name}</strong>
                  </div>
                </div>
              )}

              {/* Dynamic Fields for STUMPED */}
              {dismissalType === 'stumped' && (
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-emerald-400 uppercase">Wicketkeeper Details</div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Designated Wicketkeeper:</label>
                    <select
                      value={keeperId || designatedKeeper?.player_id}
                      onChange={(e) => setKeeperId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {bowlingFielders.map((f) => (
                        <option key={f.player_id} value={f.player_id}>
                          {f.name} {f.is_wicketkeeper ? '(Wk)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-slate-400">
                    Bowler Credited: <strong className="text-white">{bowler?.name}</strong>
                  </div>
                </div>
              )}

              {/* Dynamic Fields for RUN OUT */}
              {dismissalType === 'run_out' && (
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-emerald-400 uppercase">Run Out Details</div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Fielder Involved (Throw / Assist):</label>
                    <select
                      value={fielderId}
                      onChange={(e) => setFielderId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Direct Hit / Unknown --</option>
                      {bowlingFielders.map((f) => (
                        <option key={f.player_id} value={f.player_id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Runs completed before run out:</label>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRunsCompleted(r)}
                          className={`w-10 h-10 rounded-lg font-bold text-sm border ${
                            runsCompleted === r
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= STEP 2: CONFIRMATION SCREEN (Section 7) ================= */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Dismissed Batsman:</span>
                  <span className="font-bold text-white text-base">{dismissedPlayerName}</span>
                </div>
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Dismissal Type:</span>
                  <span className="font-bold text-red-400 uppercase">{currentDismissalObj?.label}</span>
                </div>
                {dismissalType === 'caught' && (
                  <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Catcher:</span>
                    <span className="font-semibold text-slate-200">{catcherName}</span>
                  </div>
                )}
                {dismissalType === 'stumped' && (
                  <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Wicketkeeper:</span>
                    <span className="font-semibold text-slate-200">
                      {bowlingFielders.find(f => f.player_id === (keeperId || designatedKeeper?.player_id))?.name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Bowler:</span>
                  <span className="font-semibold text-slate-200">{bowler?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Runs Completed:</span>
                  <span className="font-semibold text-slate-200">{runsCompleted}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-slate-400">Updated Score Preview:</span>
                  <span className="font-bold text-emerald-400 font-scoreboard text-base">
                    {replayed.total_runs + runsCompleted} / {currentDismissalObj?.isNotWicket ? replayed.total_wickets : replayed.total_wickets + 1}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 text-center italic">
                {dismissalType === 'caught' && `Scorecard Notation: ${dismissedPlayerName} c ${catcherName} b ${bowler?.name}`}
                {dismissalType === 'bowled' && `Scorecard Notation: ${dismissedPlayerName} b ${bowler?.name}`}
                {dismissalType === 'lbw' && `Scorecard Notation: ${dismissedPlayerName} lbw b ${bowler?.name}`}
                {dismissalType === 'stumped' && `Scorecard Notation: ${dismissedPlayerName} st ${bowlingFielders.find(f => f.player_id === (keeperId || designatedKeeper?.player_id))?.name} b ${bowler?.name}`}
              </div>
            </div>
          )}

          {/* ================= STEP 3: INCOMING BATSMAN ================= */}
          {step === 'incoming' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-medium">
                Wicket confirmed. Please select the next batsman to enter the crease:
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {incomingCandidates.map((b) => (
                  <button
                    key={b.player_id}
                    type="button"
                    onClick={() => setSelectedIncomingId(b.player_id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedIncomingId === b.player_id
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-xs text-slate-500">Not Out</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
          {step === 'select' && (
            <>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToConfirm}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95 transition-all"
              >
                Proceed to Review →
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Wicket</span>
              </button>
            </>
          )}

          {step === 'incoming' && (
            <>
              <button
                type="button"
                onClick={() => submitWicket(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Skip Incoming Batter
              </button>
              <button
                type="button"
                disabled={!selectedIncomingId}
                onClick={() => submitWicket(selectedIncomingId)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg active:scale-95 transition-all"
              >
                Continue Match →
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
