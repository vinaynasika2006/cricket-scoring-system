import uuid
import json
import math
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List

from database import get_db
from models import MatchCreateRequest, MatchRules
from engine import CricketEngine, balls_to_overs_str

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.post("")
def create_match(req: MatchCreateRequest):
    match_id = str(uuid.uuid4())
    team1_id = str(uuid.uuid4())
    team2_id = str(uuid.uuid4())
    
    # Calculate max overs per bowler if not provided
    max_overs_per_bowler = req.max_overs_per_bowler
    if not max_overs_per_bowler:
        if req.format.upper() == "T20":
            max_overs_per_bowler = 4
        elif req.format.upper() == "T10":
            max_overs_per_bowler = 2
        elif req.format.upper() == "ODI":
            max_overs_per_bowler = 10
        elif req.format.upper() == "TEST":
            max_overs_per_bowler = 999
        else:
            max_overs_per_bowler = math.ceil(req.total_overs / 5)

    with get_db() as conn:
        cursor = conn.cursor()

        # Insert Match
        cursor.execute("""
            INSERT INTO matches (
                id, title, format, total_overs, max_overs_per_bowler,
                team1_id, team2_id, toss_winner_id, toss_decision,
                status, rules_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            match_id, req.title, req.format, req.total_overs, max_overs_per_bowler,
            team1_id, team2_id,
            team1_id if req.toss_winner == "team1" else team2_id,
            req.toss_decision,
            "in_progress",
            req.rules.json()
        ))

        # Insert Teams
        cursor.execute("INSERT INTO teams (id, match_id, name, short_name) VALUES (?, ?, ?, ?)",
                       (team1_id, match_id, req.team1.name, req.team1.short_name))
        cursor.execute("INSERT INTO teams (id, match_id, name, short_name) VALUES (?, ?, ?, ?)",
                       (team2_id, match_id, req.team2.name, req.team2.short_name))

        # Insert Players for Team 1
        t1_player_map = {}
        for idx, p in enumerate(req.team1.players):
            p_id = str(uuid.uuid4())
            t1_player_map[p.name.strip().lower()] = p_id
            cursor.execute("""
                INSERT INTO players (id, match_id, team_id, name, is_captain, is_wicketkeeper, batting_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (p_id, match_id, team1_id, p.name, p.is_captain, p.is_wicketkeeper, p.batting_order or (idx + 1)))

        # Insert Players for Team 2
        t2_player_map = {}
        for idx, p in enumerate(req.team2.players):
            p_id = str(uuid.uuid4())
            t2_player_map[p.name.strip().lower()] = p_id
            cursor.execute("""
                INSERT INTO players (id, match_id, team_id, name, is_captain, is_wicketkeeper, batting_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (p_id, match_id, team2_id, p.name, p.is_captain, p.is_wicketkeeper, p.batting_order or (idx + 1)))

        # Determine Batting First and Bowling First
        if req.toss_winner == "team1":
            batting_team_id = team1_id if req.toss_decision == "bat" else team2_id
            bowling_team_id = team2_id if req.toss_decision == "bat" else team1_id
        else:
            batting_team_id = team2_id if req.toss_decision == "bat" else team1_id
            bowling_team_id = team1_id if req.toss_decision == "bat" else team2_id

        batting_players = t1_player_map if batting_team_id == team1_id else t2_player_map
        bowling_players = t2_player_map if batting_team_id == team1_id else t1_player_map

        # Resolve Opening Striker, Non-Striker, Opening Bowler IDs
        striker_id = batting_players.get(req.opening_striker_name.strip().lower())
        non_striker_id = batting_players.get(req.opening_non_striker_name.strip().lower())
        bowler_id = bowling_players.get(req.opening_bowler_name.strip().lower())

        # If not found by name, pick from first available
        if not striker_id:
            striker_id = list(batting_players.values())[0] if batting_players else None
        if not non_striker_id:
            non_striker_id = list(batting_players.values())[1] if len(batting_players) > 1 else striker_id
        if not bowler_id:
            bowler_id = list(bowling_players.values())[0] if bowling_players else None

        # Create Innings 1
        innings1_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO innings (
                id, match_id, innings_number, batting_team_id, bowling_team_id,
                total_runs, total_wickets, legal_balls, status,
                opening_striker_id, opening_non_striker_id, opening_bowler_id,
                current_striker_id, current_non_striker_id, current_bowler_id
            ) VALUES (?, ?, 1, ?, ?, 0, 0, 0, 'in_progress', ?, ?, ?, ?, ?, ?)
        """, (innings1_id, match_id, batting_team_id, bowling_team_id,
              striker_id, non_striker_id, bowler_id,
              striker_id, non_striker_id, bowler_id))

        # Update Match current_innings_id
        cursor.execute("UPDATE matches SET current_innings_id = ? WHERE id = ?", (innings1_id, match_id))

        # Log creation in audit_logs
        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'match_created', 'Match created and 1st innings started', ?)
        """, (str(uuid.uuid4()), match_id, json.dumps({"title": req.title, "format": req.format})))

    return {"message": "Match created successfully", "match_id": match_id, "innings_id": innings1_id}

@router.get("")
def list_matches():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT m.id, m.title, m.format, m.total_overs, m.status, m.result_summary,
                   m.created_at, m.updated_at,
                   t1.name as team1_name, t1.short_name as team1_short,
                   t2.name as team2_name, t2.short_name as team2_short
            FROM matches m
            LEFT JOIN teams t1 ON m.team1_id = t1.id
            LEFT JOIN teams t2 ON m.team2_id = t2.id
            ORDER BY m.created_at DESC
        """)
        matches = [dict(row) for row in cursor.fetchall()]
    return matches

@router.get("/{match_id}")
def get_match(match_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match_row = cursor.fetchone()
        if not match_row:
            raise HTTPException(status_code=404, detail="Match not found")

        match = dict(match_row)
        match["rules"] = json.loads(match.get("rules_json") or "{}")

        # Fetch teams
        cursor.execute("SELECT * FROM teams WHERE match_id = ?", (match_id,))
        teams = [dict(r) for r in cursor.fetchall()]

        # Fetch players
        cursor.execute("SELECT * FROM players WHERE match_id = ? ORDER BY batting_order ASC", (match_id,))
        players = [dict(r) for r in cursor.fetchall()]

        # Fetch innings
        cursor.execute("SELECT * FROM innings WHERE match_id = ? ORDER BY innings_number ASC", (match_id,))
        innings_list = [dict(r) for r in cursor.fetchall()]

    return {
        "match": match,
        "teams": teams,
        "players": players,
        "innings": innings_list
    }

@router.put("/{match_id}/settings")
def update_match_settings(match_id: str, data: Dict[str, Any]):
    """Allow updating team names, player names, and match settings mid-match"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Match not found")

        if "title" in data:
            cursor.execute("UPDATE matches SET title = ? WHERE id = ?", (data["title"], match_id))
        if "total_overs" in data:
            cursor.execute("UPDATE matches SET total_overs = ? WHERE id = ?", (int(data["total_overs"]), match_id))
        if "max_overs_per_bowler" in data:
            cursor.execute("UPDATE matches SET max_overs_per_bowler = ? WHERE id = ?", (int(data["max_overs_per_bowler"]), match_id))
        if "rules" in data:
            cursor.execute("UPDATE matches SET rules_json = ? WHERE id = ?", (json.dumps(data["rules"]), match_id))

        # Update Teams if provided
        if "teams" in data:
            for t in data["teams"]:
                cursor.execute("UPDATE teams SET name = ?, short_name = ? WHERE id = ?",
                               (t["name"], t["short_name"], t["id"]))

        # Update Players if provided
        if "players" in data:
            for p in data["players"]:
                cursor.execute("UPDATE players SET name = ?, is_captain = ?, is_wicketkeeper = ? WHERE id = ?",
                               (p["name"], bool(p.get("is_captain")), bool(p.get("is_wicketkeeper")), p["id"]))

        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'settings_updated', 'Match settings / teams updated', ?)
        """, (str(uuid.uuid4()), match_id, json.dumps(data)))

    return {"message": "Settings updated successfully"}

@router.delete("/{match_id}")
def delete_match(match_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE matches SET current_innings_id = NULL WHERE id = ?", (match_id,))
        cursor.execute("SELECT id FROM innings WHERE match_id = ?", (match_id,))
        innings_ids = [r["id"] for r in cursor.fetchall()]
        for inn_id in innings_ids:
            cursor.execute("DELETE FROM wickets WHERE innings_id = ?", (inn_id,))
            cursor.execute("DELETE FROM deliveries WHERE innings_id = ?", (inn_id,))
            cursor.execute("DELETE FROM fall_of_wickets WHERE innings_id = ?", (inn_id,))
        cursor.execute("DELETE FROM innings WHERE match_id = ?", (match_id,))
        cursor.execute("DELETE FROM players WHERE match_id = ?", (match_id,))
        cursor.execute("DELETE FROM teams WHERE match_id = ?", (match_id,))
        cursor.execute("DELETE FROM audit_logs WHERE match_id = ?", (match_id,))
        cursor.execute("DELETE FROM manual_overrides WHERE match_id = ?", (match_id,))
        cursor.execute("DELETE FROM matches WHERE id = ?", (match_id,))
    return {"message": "Match deleted successfully"}
