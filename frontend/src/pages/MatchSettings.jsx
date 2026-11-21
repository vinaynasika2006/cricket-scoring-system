import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function MatchSettings({ matchId, onBack }) {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [totalOvers, setTotalOvers] = useState(20);
  const [maxOversPerBowler, setMaxOversPerBowler] = useState(4);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (matchId) {
      loadMatch();
    }
  }, [matchId]);

  const loadMatch = async () => {
    try {
      setLoading(true);
      const res = await api.getMatch(matchId);
      setMatchData(res);
      setTitle(res.match.title);
      setTotalOvers(res.match.total_overs);
      setMaxOversPerBowler(res.match.max_overs_per_bowler);
      setTeams(res.teams);
      setPlayers(res.players);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings(matchId, {
        title,
        total_overs: parseInt(totalOvers),
        max_overs_per_bowler: parseInt(maxOversPerBowler),
        teams,
        players
      });
      setSaveStatus("Settings updated successfully!");
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      alert("Failed to update settings");
    }
  };

  const updateTeamName = (teamId, name) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, name } : t));
  };

  const updatePlayerName = (playerId, name) => {
    setPlayers(players.map(p => p.id === playerId ? { ...p, name } : p));
  };

  if (loading || !matchData) {
    return (
      <div className="py-20 text-center text-slate-400">Loading settings...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scoring</span>
        </button>

        <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Match Settings & Editable Lineup</span>
        </h1>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Match General Settings */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">General Configuration</h2>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Match Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Total Overs</label>
              <input
                type="number"
                value={totalOvers}
                onChange={(e) => setTotalOvers(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Max Overs / Bowler</label>
              <input
                type="number"
                value={maxOversPerBowler}
                onChange={(e) => setMaxOversPerBowler(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
              />
            </div>
          </div>
        </div>

        {/* Teams Renaming */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Team Names</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((t, i) => (
              <div key={t.id}>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Team {i + 1} Name</label>
                <input
                  type="text"
                  required
                  value={t.name}
                  onChange={(e) => updateTeamName(t.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Players Editing */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Player Names</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updatePlayerName(p.id, e.target.value)}
                  className="flex-1 bg-transparent border-0 text-xs font-semibold text-white px-2 py-1"
                />
                {p.is_wicketkeeper && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">WK</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-transform active:scale-98 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes to Database</span>
        </button>

      </form>

    </div>
  );
}
