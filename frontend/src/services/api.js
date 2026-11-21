const API_BASE = '/api';

export const api = {
  // Matches
  async getMatches() {
    const res = await fetch(`${API_BASE}/matches`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  async getMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}`);
    if (!res.ok) throw new Error('Failed to fetch match');
    return res.json();
  },

  async createMatch(matchData) {
    const res = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create match');
    }
    return res.json();
  },

  async updateSettings(matchId, settingsData) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async deleteMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete match');
    return res.json();
  },

  // Scoring
  async getLiveState(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/live`);
    if (!res.ok) throw new Error('Failed to fetch live state');
    return res.json();
  },

  async recordDelivery(matchId, deliveryData) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveryData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to record delivery');
    }
    return res.json();
  },

  async recordWicket(matchId, wicketData) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/wicket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wicketData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to record wicket');
    }
    return res.json();
  },

  async changeBowler(matchId, bowlerId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/bowler-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bowler_id: bowlerId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to change bowler');
    }
    return res.json();
  },

  async setIncomingBatsman(matchId, batsmanId, isStriker = true) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/incoming-batsman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batsman_id: batsmanId, is_striker: isStriker })
    });
    if (!res.ok) throw new Error('Failed to set batsman');
    return res.json();
  },

  async recordPenalty(matchId, penaltyData) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/penalty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(penaltyData)
    });
    if (!res.ok) throw new Error('Failed to record penalty');
    return res.json();
  },

  async undoLastDelivery(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/undo`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to undo');
    }
    return res.json();
  },

  async editDelivery(matchId, deliveryId, editData) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/deliveries/${deliveryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    });
    if (!res.ok) throw new Error('Failed to edit delivery');
    return res.json();
  },

  async deleteDelivery(matchId, deliveryId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/deliveries/${deliveryId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete delivery');
    return res.json();
  },

  async startSecondInnings(matchId, data) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/innings/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to start 2nd innings');
    }
    return res.json();
  },

  async applyManualCorrection(matchId, data) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/manual-correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to apply correction');
    return res.json();
  },

  // Scorecard
  async getScorecard(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/scorecard`);
    if (!res.ok) throw new Error('Failed to fetch scorecard');
    return res.json();
  },

  async setPlayerOfMatch(matchId, playerId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/player-of-match`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    });
    if (!res.ok) throw new Error('Failed to set player of the match');
    return res.json();
  },

  getPdfUrl(matchId) {
    return `${API_BASE}/matches/${matchId}/export-pdf`;
  }
};
