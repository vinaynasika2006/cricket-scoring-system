import sqlite3
import json
import os
from contextlib import contextmanager

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "cricket.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Matches Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            format TEXT NOT NULL,
            total_overs INTEGER NOT NULL,
            max_overs_per_bowler INTEGER NOT NULL,
            team1_id TEXT,
            team2_id TEXT,
            toss_winner_id TEXT,
            toss_decision TEXT, -- 'bat' or 'bowl'
            status TEXT NOT NULL DEFAULT 'setup', -- 'setup', 'in_progress', 'innings_break', 'completed'
            current_innings_id TEXT,
            result_type TEXT, -- 'wickets', 'runs', 'tied', 'drawn', 'no_result'
            result_summary TEXT,
            winner_team_id TEXT,
            winning_margin INTEGER,
            player_of_the_match_id TEXT,
            rules_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Teams Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            name TEXT NOT NULL,
            short_name TEXT NOT NULL,
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
        );
        """)

        # Players Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            name TEXT NOT NULL,
            is_captain BOOLEAN DEFAULT 0,
            is_wicketkeeper BOOLEAN DEFAULT 0,
            batting_order INTEGER DEFAULT 0,
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
            FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
        );
        """)

        # Innings Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS innings (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            innings_number INTEGER NOT NULL,
            batting_team_id TEXT NOT NULL,
            bowling_team_id TEXT NOT NULL,
            total_runs INTEGER DEFAULT 0,
            total_wickets INTEGER DEFAULT 0,
            legal_balls INTEGER DEFAULT 0,
            target INTEGER,
            status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
            opening_striker_id TEXT,
            opening_non_striker_id TEXT,
            opening_bowler_id TEXT,
            current_striker_id TEXT,
            current_non_striker_id TEXT,
            current_bowler_id TEXT,
            previous_bowler_id TEXT,
            free_hit_active BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
            FOREIGN KEY (batting_team_id) REFERENCES teams (id),
            FOREIGN KEY (bowling_team_id) REFERENCES teams (id)
        );
        """)

        # Deliveries Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS deliveries (
            id TEXT PRIMARY KEY,
            innings_id TEXT NOT NULL,
            over_number INTEGER NOT NULL, -- 0-indexed over number (e.g. Over 0 = 1st over)
            ball_in_over INTEGER NOT NULL, -- 1-indexed ball in that over
            legal_ball_number INTEGER NOT NULL, -- Cumulative legal balls in innings
            bowler_id TEXT NOT NULL,
            striker_id TEXT NOT NULL,
            non_striker_id TEXT NOT NULL,
            delivery_type TEXT NOT NULL, -- 'normal', 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty'
            bat_runs INTEGER DEFAULT 0,
            extra_runs INTEGER DEFAULT 0,
            extra_type TEXT, -- 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty'
            total_delivery_runs INTEGER DEFAULT 0,
            is_legal BOOLEAN DEFAULT 1,
            is_free_hit BOOLEAN DEFAULT 0,
            is_boundary_4 BOOLEAN DEFAULT 0,
            is_boundary_6 BOOLEAN DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (innings_id) REFERENCES innings (id) ON DELETE CASCADE
        );
        """)

        # Wickets Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS wickets (
            id TEXT PRIMARY KEY,
            delivery_id TEXT NOT NULL,
            innings_id TEXT NOT NULL,
            player_out_id TEXT NOT NULL,
            incoming_batsman_id TEXT,
            dismissal_type TEXT NOT NULL, -- 'bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_out', 'retired_hurt', 'obstructing_field', 'hit_ball_twice', 'timed_out'
            bowler_id TEXT,
            fielder_id TEXT,
            wicketkeeper_id TEXT,
            runs_completed INTEGER DEFAULT 0,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE,
            FOREIGN KEY (innings_id) REFERENCES innings (id) ON DELETE CASCADE
        );
        """)

        # Migration: ensure incoming_batsman_id exists in wickets
        try:
            cursor.execute("ALTER TABLE wickets ADD COLUMN incoming_batsman_id TEXT")
        except Exception:
            pass

        # Fall of Wickets Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS fall_of_wickets (
            id TEXT PRIMARY KEY,
            innings_id TEXT NOT NULL,
            wicket_number INTEGER NOT NULL,
            score_at_fall INTEGER NOT NULL,
            overs_at_fall TEXT NOT NULL,
            player_out_id TEXT NOT NULL,
            partnership_runs INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (innings_id) REFERENCES innings (id) ON DELETE CASCADE
        );
        """)

        # Audit Logs Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            description TEXT NOT NULL,
            details_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
        );
        """)

        # Manual Overrides Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS manual_overrides (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            innings_id TEXT,
            target_type TEXT NOT NULL, -- 'score', 'player_stat', 'bowler_stat', 'extras'
            target_id TEXT,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
        );
        """)
