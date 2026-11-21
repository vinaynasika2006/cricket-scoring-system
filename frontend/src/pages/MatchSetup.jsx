import React, { useState } from 'react';
import { Plus, Trash2, Shield, Settings, Play, Users, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_T1_PLAYERS = [
  "Rohit Sharma", "Yashasvi Jaiswal", "Virat Kohli", "Suryakumar Yadav",
  "Rishabh Pant", "Hardik Pandya", "Ravindra Jadeja", "Axar Patel",
  "Kuldeep Yadav", "Jasprit Bumrah", "Mohammed Siraj"
];

const DEFAULT_T2_PLAYERS = [
  "Travis Head", "David Warner", "Mitchell Marsh", "Steve Smith",
  "Glenn Maxwell", "Marcus Stoinis", "Alex Carey", "Pat Cummins",
  "Mitchell Starc", "Adam Zampa", "Josh Hazlewood"
];

export default function MatchSetup({ onMatchCreated }) {
  const [title, setTitle] = useState("India vs Australia - 1st T20I");
  const [format, setFormat] = useState("T20"); // 'T10', 'T20', 'ODI', 'Test', 'Custom'
  const [totalOvers, setTotalOvers] = useState(20);
  const [maxOversPerBowler, setMaxOversPerBowler] = useState(4);

  // Teams
  const [team1Name, setTeam1Name] = useState("India");
  const [team1Short, setTeam1Short] = useState("IND");
  const [team1Players, setTeam1Players] = useState(
    DEFAULT_T1_PLAYERS.map((name, i) => ({
      name,
      is_captain: i === 0,
      is_wicketkeeper: i === 4,
      batting_order: i + 1
    }))
  );

  const [team2Name, setTeam2Name] = useState("Australia");
  const [team2Short, setTeam2Short] = useState("AUS");
  const [team2Players, setTeam2Players] = useState(
    DEFAULT_T2_PLAYERS.map((name, i) => ({
      name,
      is_captain: i === 7,
      is_wicketkeeper: i === 6,
      batting_order: i + 1
    }))
  );

  // Toss
  const [tossWinner, setTossWinner] = useState("team1"); // 'team1' or 'team2'
  const [tossDecision, setTossDecision] = useState("bat"); // 'bat' or 'bowl'

  // Openers selection
  const [strikerName, setStrikerName] = useState(DEFAULT_T1_PLAYERS[0]);
  const [nonStrikerName, setNonStrikerName] = useState(DEFAULT_T1_PLAYERS[1]);
  const [bowlerName, setBowlerName] = useState(DEFAULT_T2_PLAYERS[7]);

  // Competition Rules
  const [freeHitEnabled, setFreeHitEnabled] = useState(true);
  const [superOverEnabled, setSuperOverEnabled] = useState(true);
  const [lbwRuleEnabled, setLbwRuleEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle format change
  const handleFormatChange = (newFormat) => {
    setFormat(newFormat);
    if (newFormat === "T10") {
      setTotalOvers(10);
      setMaxOversPerBowler(2);
    } else if (newFormat === "T20") {
      setTotalOvers(20);
      setMaxOversPerBowler(4);
    } else if (newFormat === "ODI") {
      setTotalOvers(50);
      setMaxOversPerBowler(10);
    } else if (newFormat === "Test") {
      setTotalOvers(90);
      setMaxOversPerBowler(999);
    }
  };

  // Player roster modifications
  const addPlayer = (teamNum) => {
    if (teamNum === 1) {
      setTeam1Players([...team1Players, { name: `Player ${team1Players.length + 1}`, is_captain: false, is_wicketkeeper: false, batting_order: team1Players.length + 1 }]);
    } else {
      setTeam2Players([...team2Players, { name: `Player ${team2Players.length + 1}`, is_captain: false, is_wicketkeeper: false, batting_order: team2Players.length + 1 }]);
    }
  };

  const removePlayer = (teamNum, index) => {
    if (teamNum === 1) {
      if (team1Players.length <= 2) return;
      setTeam1Players(team1Players.filter((_, i) => i !== index));
    } else {
      if (team2Players.length <= 2) return;
      setTeam2Players(team2Players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (teamNum, index, field, value) => {
    if (teamNum === 1) {
      const copy = [...team1Players];
      copy[index][field] = value;
      setTeam1Players(copy);
    } else {
      const copy = [...team2Players];
      copy[index][field] = value;
      setTeam2Players(copy);
    }
  };

  // Determine which team bats first
  const battingFirstTeam = (tossWinner === "team1" && tossDecision === "bat") || (tossWinner === "team2" && tossDecision === "bowl")
    ? { name: team1Name, players: team1Players }
    : { name: team2Name, players: team2Players };

  const bowlingFirstTeam = battingFirstTeam.name === team1Name
    ? { name: team2Name, players: team2Players }
    : { name: team1Name, players: team1Players };

  const handleStartMatch = async (e) => {
    e.preventDefault();
    setError("");

    if (!strikerName || !nonStrikerName || !bowlerName) {
      setError("Please select the opening striker, non-striker, and opening bowler.");
      return;
    }

    if (strikerName === nonStrikerName) {
      setError("Opening striker and non-striker cannot be the same player.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        format,
        total_overs: parseInt(totalOvers),
        max_overs_per_bowler: parseInt(maxOversPerBowler),
        team1: {
          name: team1Name.trim(),
          short_name: team1Short.trim() || team1Name.substring(0, 3).toUpperCase(),
          players: team1Players.map((p, idx) => ({ ...p, batting_order: idx + 1 }))
        },
        team2: {
          name: team2Name.trim(),
          short_name: team2Short.trim() || team2Name.substring(0, 3).toUpperCase(),
          players: team2Players.map((p, idx) => ({ ...p, batting_order: idx + 1 }))
        },
        toss_winner: tossWinner,
        toss_decision: tossDecision,
        opening_striker_name: strikerName,
        opening_non_striker_name: nonStrikerName,
        opening_bowler_name: bowlerName,
        rules: {
          free_hit_enabled: freeHitEnabled,
          super_over_enabled: superOverEnabled,
          lbw_rule_enabled: lbwRuleEnabled
        }
      };

      const res = await api.createMatch(payload);
      onMatchCreated(res.match_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      
      {/* Title Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
            Match Setup & Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure teams, players, toss, playing conditions, and opening lineup
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/70 border border-red-700 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleStartMatch} className="space-y-8">
        
        {/* Match General Info Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>Match Information & Formats (Section 2)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">Match Title / Tournament</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. World Cup Final 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Match Format</label>
              <div className="grid grid-cols-5 gap-1.5">
                {['T10', 'T20', 'ODI', 'Test', 'Custom'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatChange(fmt)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                      format === fmt
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Total Overs per Innings</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={totalOvers}
                onChange={(e) => setTotalOvers(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white font-scoreboard focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Max Overs per Bowler</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={maxOversPerBowler}
                onChange={(e) => setMaxOversPerBowler(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white font-scoreboard focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Teams and Player Rosters (Section 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TEAM 1 ROSTER */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Team 1 Setup</h3>
              </div>
              <span className="text-xs text-slate-400">{team1Players.length} Players</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Team 1 Full Name</label>
                <input
                  type="text"
                  required
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  maxLength="4"
                  value={team1Short}
                  onChange={(e) => setTeam1Short(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white text-center font-bold"
                />
              </div>
            </div>

            {/* Players list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {team1Players.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-xs font-scoreboard text-slate-500 w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    value={p.name}
                    onChange={(e) => updatePlayer(1, idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-0 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1"
                  />
                  
                  <button
                    type="button"
                    onClick={() => updatePlayer(1, idx, 'is_wicketkeeper', !p.is_wicketkeeper)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      p.is_wicketkeeper
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                    title="Designate Wicketkeeper"
                  >
                    WK
                  </button>

                  <button
                    type="button"
                    onClick={() => removePlayer(1, idx)}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addPlayer(1)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 hover:border-emerald-500 text-xs text-slate-400 hover:text-emerald-300 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Player to {team1Name}</span>
            </button>
          </div>

          {/* TEAM 2 ROSTER */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Team 2 Setup</h3>
              </div>
              <span className="text-xs text-slate-400">{team2Players.length} Players</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Team 2 Full Name</label>
                <input
                  type="text"
                  required
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  maxLength="4"
                  value={team2Short}
                  onChange={(e) => setTeam2Short(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white text-center font-bold"
                />
              </div>
            </div>

            {/* Players list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {team2Players.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-xs font-scoreboard text-slate-500 w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    value={p.name}
                    onChange={(e) => updatePlayer(2, idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-0 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                  />
                  
                  <button
                    type="button"
                    onClick={() => updatePlayer(2, idx, 'is_wicketkeeper', !p.is_wicketkeeper)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      p.is_wicketkeeper
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                    title="Designate Wicketkeeper"
                  >
                    WK
                  </button>

                  <button
                    type="button"
                    onClick={() => removePlayer(2, idx)}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addPlayer(2)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 hover:border-blue-500 text-xs text-slate-400 hover:text-blue-300 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Player to {team2Name}</span>
            </button>
          </div>

        </div>

        {/* Toss & Opening Lineup */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span>🪙</span>
            <span>Toss Decision & Opening Pair (Section 2)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Toss Winner</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTossWinner("team1")}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    tossWinner === "team1"
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {team1Name}
                </button>
                <button
                  type="button"
                  onClick={() => setTossWinner("team2")}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    tossWinner === "team2"
                      ? 'bg-blue-500/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {team2Name}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Elected To</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTossDecision("bat")}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    tossDecision === "bat"
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  🏏 Bat First
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision("bowl")}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    tossDecision === "bowl"
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  ⚾ Bowl First
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              Batting First: <strong>{battingFirstTeam.name}</strong> • Bowling First: <strong>{bowlingFirstTeam.name}</strong>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Opening Striker *</label>
                <select
                  value={strikerName}
                  onChange={(e) => setStrikerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {battingFirstTeam.players.map((p, i) => (
                    <option key={i} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Opening Non-Striker</label>
                <select
                  value={nonStrikerName}
                  onChange={(e) => setNonStrikerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {battingFirstTeam.players.map((p, i) => (
                    <option key={i} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Opening Bowler ({bowlingFirstTeam.name})</label>
                <select
                  value={bowlerName}
                  onChange={(e) => setBowlerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {bowlingFirstTeam.players.map((p, i) => (
                    <option key={i} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Competition Rules Configuration (Section 2) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Competition Playing Conditions</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={freeHitEnabled}
                onChange={(e) => setFreeHitEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
              />
              <div>
                <div className="text-xs font-bold text-white">Free Hit on No-Balls</div>
                <div className="text-[10px] text-slate-400">Section 8 requirement</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={superOverEnabled}
                onChange={(e) => setSuperOverEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
              />
              <div>
                <div className="text-xs font-bold text-white">Super Over on Tie</div>
                <div className="text-[10px] text-slate-400">Tie-break innings</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={lbwRuleEnabled}
                onChange={(e) => setLbwRuleEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
              />
              <div>
                <div className="text-xs font-bold text-white">LBW Law Active</div>
                <div className="text-[10px] text-slate-400">Law 36 compliance</div>
              </div>
            </label>
          </div>
        </div>

        {/* Start Match Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-2xl transition-transform active:scale-98 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>{loading ? "Starting Match..." : "Start Match (Begin Scoring)"}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
