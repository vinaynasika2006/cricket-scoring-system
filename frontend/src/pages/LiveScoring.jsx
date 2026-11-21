import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, FileText, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../services/api';

import Scoreboard from '../components/Scoreboard';
import ScoringPad from '../components/ScoringPad';
import WicketModal from '../components/WicketModal';
import OverChangeModal from '../components/OverChangeModal';
import InningsTransitionModal from '../components/InningsTransitionModal';
import MatchResultModal from '../components/MatchResultModal';
import ManualCorrectionModal from '../components/ManualCorrectionModal';
import BatsmanScorecard from '../components/BatsmanScorecard';
import BowlingScorecard from '../components/BowlingScorecard';
import BallByBallHistory from '../components/BallByBallHistory';

export default function LiveScoring({ matchId, onNavigateTab, onStartNewMatch }) {
  const [liveState, setLiveState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showOverChangeModal, setShowOverChangeModal] = useState(false);
  const [showInningsTransition, setShowInningsTransition] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [selectBatterModal, setSelectBatterModal] = useState({ isOpen: false, isStriker: true });
  const [penaltyRuns, setPenaltyRuns] = useState(5);
  const [penaltyReason, setPenaltyReason] = useState('Ball tampering / Unfair play');

  useEffect(() => {
    if (matchId) {
      loadLiveState();
    }
  }, [matchId]);

  const loadLiveState = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getLiveState(matchId);
      setLiveState(data);

      // Check lifecycle transitions
      if (data.match?.status === 'completed' || (data.result && data.result.is_finished)) {
        setShowMatchResult(true);
      } else if (data.innings?.status === 'completed' || data.replayed?.is_completed) {
        if (data.innings?.innings_number === 1) {
          setShowInningsTransition(true);
        } else {
          setShowMatchResult(true);
        }
      } else if (data.replayed?.is_over_complete) {
        setShowOverChangeModal(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load live match state');
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleScoreDelivery = async (deliveryPayload) => {
    try {
      setError('');
      const updated = await api.recordDelivery(matchId, deliveryPayload);
      setLiveState(updated);

      if (updated.match?.status === 'completed' || (updated.result && updated.result.is_finished)) {
        setShowMatchResult(true);
      } else if (updated.replayed?.is_completed && updated.innings?.innings_number === 1) {
        setShowInningsTransition(true);
      } else if (updated.replayed?.is_over_complete) {
        setShowOverChangeModal(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmWicket = async (wicketPayload) => {
    try {
      setError('');
      const updated = await api.recordWicket(matchId, wicketPayload);
      setLiveState(updated);

      if (updated.match?.status === 'completed' || (updated.result && updated.result.is_finished)) {
        setShowMatchResult(true);
      } else if (updated.replayed?.is_completed && updated.innings?.innings_number === 1) {
        setShowInningsTransition(true);
      } else if (updated.replayed?.is_over_complete) {
        setShowOverChangeModal(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectBowler = async (bowlerId) => {
    try {
      setError('');
      const updated = await api.changeBowler(matchId, bowlerId);
      setLiveState(updated);
      setShowOverChangeModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectBatter = async (batsmanId) => {
    try {
      setError('');
      const updated = await api.setIncomingBatsman(matchId, batsmanId, selectBatterModal.isStriker);
      setLiveState(updated);
      setSelectBatterModal({ isOpen: false, isStriker: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUndo = async () => {
    try {
      setError('');
      const updated = await api.undoLastDelivery(matchId);
      setLiveState(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditDelivery = async (deliveryId, editData) => {
    try {
      setError('');
      const updated = await api.editDelivery(matchId, deliveryId, editData);
      setLiveState(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDelivery = async (deliveryId) => {
    try {
      setError('');
      const updated = await api.deleteDelivery(matchId, deliveryId);
      setLiveState(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartSecondInnings = async (openersPayload) => {
    try {
      setError('');
      const updated = await api.startSecondInnings(matchId, openersPayload);
      setLiveState(updated);
      setShowInningsTransition(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAwardPenalty = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const updated = await api.recordPenalty(matchId, {
        runs: parseInt(penaltyRuns),
        receiving_team_id: 'batting',
        reason: penaltyReason
      });
      setLiveState(updated);
      setShowPenaltyModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && !liveState) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Loading match engine...</p>
      </div>
    );
  }

  if (error && !liveState) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-red-950/70 border border-red-700 rounded-3xl text-red-200">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-bold mb-1">Match Error</h2>
          <p className="text-xs mb-4">{error}</p>
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onNavigateTab('dashboard')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCorrectionModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Manual Overrides</span>
          </button>

          <button
            onClick={() => onNavigateTab('scorecard')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Full Scorecard</span>
          </button>

          <button
            onClick={loadLiveState}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
            title="Refresh Score"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error alert toast if present */}
      {error && (
        <div className="p-3 bg-red-950/80 border border-red-700 rounded-xl text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Live Scoreboard */}
      <Scoreboard
        liveState={liveState}
        onSelectBowler={() => setShowOverChangeModal(true)}
        onSelectBatter={(isStriker) => setSelectBatterModal({ isOpen: true, isStriker })}
      />

      {/* Scoring Pad (Fast Manual Buttons) */}
      <ScoringPad
        onScoreDelivery={handleScoreDelivery}
        onOpenWicket={() => setShowWicketModal(true)}
        onOpenPenalty={() => setShowPenaltyModal(true)}
        onOpenBowlerSelect={() => setShowOverChangeModal(true)}
        onUndo={handleUndo}
        disabled={liveState?.match?.status === 'completed'}
        needsBowler={Boolean(liveState?.replayed?.is_over_complete || !liveState?.bowler)}
      />

      {/* Batting and Bowling Scorecards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BatsmanScorecard
          batsmanStats={liveState?.replayed?.batsman_stats || []}
        />
        <BowlingScorecard
          bowlerStats={liveState?.replayed?.bowler_stats || []}
        />
      </div>

      {/* Ball-by-ball Chronology */}
      <BallByBallHistory
        liveState={liveState}
        onEditDelivery={handleEditDelivery}
        onDeleteDelivery={handleDeleteDelivery}
        onUndo={handleUndo}
      />

      {/* Advanced Wicket Modal */}
      <WicketModal
        isOpen={showWicketModal}
        onClose={() => setShowWicketModal(false)}
        liveState={liveState}
        onConfirmWicket={handleConfirmWicket}
      />

      {/* Over Change Modal */}
      <OverChangeModal
        isOpen={showOverChangeModal}
        eligibleBowlers={liveState?.eligible_bowlers || []}
        previousBowlerId={liveState?.replayed?.previous_bowler_id}
        isOverComplete={Boolean(liveState?.replayed?.is_over_complete)}
        onSelectBowler={handleSelectBowler}
        onClose={() => setShowOverChangeModal(false)}
      />

      {/* 2nd Innings Transition Modal */}
      <InningsTransitionModal
        isOpen={showInningsTransition}
        liveState={liveState}
        onStartSecondInnings={handleStartSecondInnings}
      />

      {/* Final Match Result Modal */}
      <MatchResultModal
        isOpen={showMatchResult}
        liveState={liveState}
        onViewScorecard={() => {
          setShowMatchResult(false);
          onNavigateTab('scorecard');
        }}
        onStartNewMatch={onStartNewMatch}
      />

      {/* Manual Correction Modal */}
      <ManualCorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        liveState={liveState}
        onRefresh={loadLiveState}
      />

      {/* Penalty Modal */}
      {showPenaltyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Award Penalty Runs</span>
            </h3>
            <form onSubmit={handleAwardPenalty} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Penalty Runs (Default: 5)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={penaltyRuns}
                  onChange={(e) => setPenaltyRuns(parseInt(e.target.value) || 5)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason (Law 41 / 42)</label>
                <input
                  type="text"
                  required
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPenaltyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Confirm Penalty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select / Change Batter Modal */}
      {selectBatterModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Select {selectBatterModal.isStriker ? 'Striker' : 'Non-Striker'}
                </h3>
                <p className="text-xs text-slate-400">Choose incoming or replacement batsman</p>
              </div>
              <button
                onClick={() => setSelectBatterModal({ isOpen: false, isStriker: true })}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
              {(liveState?.available_incoming || []).length > 0 ? (
                liveState.available_incoming.map((b) => (
                  <button
                    key={b.player_id}
                    onClick={() => handleSelectBatter(b.player_id)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800/80 text-left flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{b.name}</div>
                      <div className="text-[11px] text-slate-400">Not Out</div>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold">Place on Crease →</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No other available batsmen (all out or at crease).
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectBatterModal({ isOpen: false, isStriker: true })}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
