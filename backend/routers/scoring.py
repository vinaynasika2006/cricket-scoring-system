import uuid
import json
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

from database import get_db
from models import (
    DeliveryRequest, WicketRequest, BowlerChangeRequest,
    IncomingBatsmanRequest, PenaltyRequest, StartSecondInningsRequest,
    ManualCorrectionRequest, DeliveryEditRequest
)
from engine import (
    CricketEngine, validate_dismissal_rule, balls_to_overs_str,
    DISMISSAL_RETIRED_HURT, DISMISSAL_BOWLED, DISMISSAL_CAUGHT,
    DISMISSAL_LBW, DISMISSAL_STUMPED, DISMISSAL_HIT_WICKET
)

router = APIRouter(prefix="/api/matches/{match_id}", tags=["scoring"])

def fetch_innings_data(conn, innings_id: str):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM innings WHERE id = ?", (innings_id,))
    inn = cursor.fetchone()
    if not inn:
        return None, None, None, None, None
    innings_row = dict(inn)

    cursor.execute("SELECT * FROM players WHERE team_id = ? ORDER BY batting_order ASC", (innings_row["batting_team_id"],))
    batting_players = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM players WHERE team_id = ? ORDER BY batting_order ASC", (innings_row["bowling_team_id"],))
    bowling_players = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM deliveries WHERE innings_id = ? ORDER BY rowid ASC", (innings_id,))
    deliveries = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM wickets WHERE innings_id = ? ORDER BY rowid ASC", (innings_id,))
    wickets = [dict(r) for r in cursor.fetchall()]

    return innings_row, batting_players, bowling_players, deliveries, wickets

def get_live_state_helper(conn, match_id: str):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
    match_row = cursor.fetchone()
    if not match_row:
        raise HTTPException(status_code=404, detail="Match not found")
    match = dict(match_row)
    match_settings = {
        "total_overs": match["total_overs"],
        "max_overs_per_bowler": match["max_overs_per_bowler"],
        "free_hit_enabled": json.loads(match.get("rules_json") or "{}").get("free_hit_enabled", True),
        "super_over_enabled": json.loads(match.get("rules_json") or "{}").get("super_over_enabled", False),
    }

    current_innings_id = match.get("current_innings_id")
    if not current_innings_id:
        cursor.execute("SELECT id FROM innings WHERE match_id = ? ORDER BY innings_number DESC LIMIT 1", (match_id,))
        inn = cursor.fetchone()
        current_innings_id = inn["id"] if inn else None

    if not current_innings_id:
        raise HTTPException(status_code=400, detail="No active innings for this match")

    innings_row, batting_players, bowling_players, deliveries, wickets = fetch_innings_data(conn, current_innings_id)

    target = innings_row.get("target")
    replayed = CricketEngine.replay_innings(
        innings_info=innings_row,
        batting_players=batting_players,
        bowling_players=bowling_players,
        deliveries=deliveries,
        wickets=wickets,
        match_settings=match_settings,
        target=target
    )

    # Batting and Bowling Teams info
    cursor.execute("SELECT * FROM teams WHERE id = ?", (innings_row["batting_team_id"],))
    batting_team = dict(cursor.fetchone())
    cursor.execute("SELECT * FROM teams WHERE id = ?", (innings_row["bowling_team_id"],))
    bowling_team = dict(cursor.fetchone())

    # Get Active Batsmen details
    striker_id = replayed["current_striker_id"]
    non_striker_id = replayed["current_non_striker_id"]
    bowler_id = replayed["current_bowler_id"]

    striker_stat = next((b for b in replayed["batsman_stats"] if b["player_id"] == striker_id), None)
    non_striker_stat = next((b for b in replayed["batsman_stats"] if b["player_id"] == non_striker_id), None)
    bowler_stat = next((b for b in replayed["bowler_stats"] if b["player_id"] == bowler_id), None)

    # Next eligible bowlers
    eligible_bowlers = []
    for b in replayed["bowler_stats"]:
        # Cannot bowl consecutive overs if more than 1 bowler available
        is_previous_bowler = (b["player_id"] == replayed["previous_bowler_id"])
        has_overs_left = (overs_str_to_balls(b["overs_str"]) < match_settings["max_overs_per_bowler"] * 6)
        if has_overs_left:
            eligible_bowlers.append({
                **b,
                "is_consecutive_blocked": is_previous_bowler and len(bowling_players) > 1
            })

    # Dismissed players cannot be incoming batsmen
    dismissed_ids = set()
    for w in wickets:
        if w.get("dismissal_type") != DISMISSAL_RETIRED_HURT:
            p_out = w.get("player_out_id")
            if p_out:
                dismissed_ids.add(p_out)

    for b in replayed["batsman_stats"]:
        if b.get("status") in ("out", "retired_out"):
            dismissed_ids.add(b["player_id"])

    # Available incoming batsmen
    available_incoming = [
        b for b in replayed["batsman_stats"]
        if b["status"] == "not_out"
        and b["player_id"] not in (striker_id, non_striker_id)
        and b["player_id"] not in dismissed_ids
    ]

    # Check match result if 2nd innings
    result = None
    if innings_row["innings_number"] == 2:
        cursor.execute("SELECT id FROM innings WHERE match_id = ? AND innings_number = 1", (match_id,))
        inn1_row = cursor.fetchone()
        if inn1_row:
            inn1_info, inn1_bat, inn1_bowl, inn1_delivs, inn1_wicks = fetch_innings_data(conn, inn1_row["id"])
            inn1_replayed = CricketEngine.replay_innings(
                innings_info=inn1_info,
                batting_players=inn1_bat,
                bowling_players=inn1_bowl,
                deliveries=inn1_delivs,
                wickets=inn1_wicks,
                match_settings=match_settings
            )
            result = CricketEngine.calculate_match_result(
                innings1_state=inn1_replayed,
                innings2_state=replayed,
                team1_name=bowling_team["name"],
                team2_name=batting_team["name"],
                batting_first_team=bowling_team["name"],
                batting_second_team=batting_team["name"],
                total_overs=match_settings["total_overs"],
                super_over_enabled=match_settings["super_over_enabled"]
            )
            if result["is_finished"] and match["status"] != "completed":
                cursor.execute("""
                    UPDATE matches SET status = 'completed', result_type = ?, result_summary = ?, winning_margin = ?
                    WHERE id = ?
                """, (result["result_type"], result["summary"], result["margin"], match_id))
                match["status"] = "completed"
                match["result_summary"] = result["summary"]

    return {
        "match": match,
        "innings": innings_row,
        "batting_team": batting_team,
        "bowling_team": bowling_team,
        "replayed": replayed,
        "striker": striker_stat,
        "non_striker": non_striker_stat,
        "bowler": bowler_stat,
        "eligible_bowlers": eligible_bowlers,
        "available_incoming": available_incoming,
        "result": result
    }

def overs_str_to_balls(overs_str: str) -> int:
    try:
        if "." in str(overs_str):
            p = str(overs_str).split(".")
            return int(p[0]) * 6 + int(p[1])
        return int(overs_str) * 6
    except Exception:
        return 0

@router.get("/live")
def get_live_scoring(match_id: str):
    with get_db() as conn:
        return get_live_state_helper(conn, match_id)

@router.post("/delivery")
def record_delivery(match_id: str, req: DeliveryRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        state = get_live_state_helper(conn, match_id)
        innings = state["innings"]
        replayed = state["replayed"]

        if state["match"]["status"] == "completed":
            raise HTTPException(status_code=400, detail="Match is already completed")

        if innings["status"] == "completed" or replayed["is_completed"]:
            raise HTTPException(status_code=400, detail="Innings is already completed")

        striker_id = req.striker_id or replayed["current_striker_id"]
        non_striker_id = req.non_striker_id or replayed["current_non_striker_id"]
        bowler_id = req.bowler_id or replayed["current_bowler_id"]

        if not striker_id or not non_striker_id:
            raise HTTPException(status_code=400, detail="Striker and Non-striker must be set before scoring")

        if striker_id == non_striker_id:
            raise HTTPException(status_code=400, detail="Striker and Non-striker cannot be the same batsman")

        if not bowler_id:
            raise HTTPException(status_code=400, detail="Over is complete. Please select the next bowler before scoring.")

        if bowler_id == replayed["previous_bowler_id"] and len(state["eligible_bowlers"]) > 1 and replayed.get("is_over_complete"):
            raise HTTPException(status_code=400, detail="A bowler cannot bowl consecutive overs. Please select the next bowler.")

        # Calculate over number and ball in over
        legal_balls_so_far = replayed["legal_balls"]
        current_over_number = legal_balls_so_far // 6
        ball_in_over = (legal_balls_so_far % 6) + 1

        effects = CricketEngine.process_delivery_effects(
            delivery_type=req.delivery_type,
            bat_runs=req.bat_runs,
            extra_runs=req.extra_runs,
            is_free_hit=replayed["free_hit_active"]
        )

        delivery_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO deliveries (
                id, innings_id, over_number, ball_in_over, legal_ball_number,
                bowler_id, striker_id, non_striker_id, delivery_type,
                bat_runs, extra_runs, extra_type, total_delivery_runs,
                is_legal, is_free_hit, is_boundary_4, is_boundary_6, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            delivery_id, innings["id"], current_over_number, ball_in_over,
            legal_balls_so_far + (1 if effects["is_legal"] else 0),
            bowler_id, striker_id, non_striker_id, req.delivery_type,
            effects["bat_runs"], effects["extra_runs"], effects["extra_type"],
            effects["total_delivery_runs"], effects["is_legal"],
            replayed["free_hit_active"], effects["is_boundary_4"], effects["is_boundary_6"],
            req.notes
        ))

        # Replay to update database record
        updated_state = get_live_state_helper(conn, match_id)
        up_replayed = updated_state["replayed"]
        cursor.execute("""
            UPDATE innings SET
                total_runs = ?, total_wickets = ?, legal_balls = ?,
                current_striker_id = ?, current_non_striker_id = ?, current_bowler_id = ?,
                previous_bowler_id = ?, free_hit_active = ?,
                status = ?
            WHERE id = ?
        """, (
            up_replayed["total_runs"], up_replayed["total_wickets"], up_replayed["legal_balls"],
            up_replayed["current_striker_id"], up_replayed["current_non_striker_id"], up_replayed["current_bowler_id"],
            up_replayed["previous_bowler_id"], up_replayed["free_hit_active"],
            "completed" if up_replayed["is_completed"] else "in_progress",
            innings["id"]
        ))

        if up_replayed["is_completed"]:
            if innings["innings_number"] == 1:
                cursor.execute("UPDATE matches SET status = 'innings_break' WHERE id = ?", (match_id,))
            else:
                cursor.execute("UPDATE matches SET status = 'completed' WHERE id = ?", (match_id,))

        return updated_state

@router.post("/wicket")
def record_wicket(match_id: str, req: WicketRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        state = get_live_state_helper(conn, match_id)
        innings = state["innings"]
        replayed = state["replayed"]

        is_free_hit = replayed["free_hit_active"]
        is_wide = (req.delivery_type == "wide")
        is_no_ball = (req.delivery_type == "no_ball")

        # Validate dismissal rules (e.g. bowled on no-ball/free-hit disallowed)
        valid, err_msg = validate_dismissal_rule(req.dismissal_type, is_no_ball, is_free_hit, is_wide)
        if not valid:
            raise HTTPException(status_code=400, detail=err_msg)

        striker_id = replayed["current_striker_id"]
        non_striker_id = replayed["current_non_striker_id"]
        bowler_id = req.bowler_id or replayed["current_bowler_id"]

        legal_balls_so_far = replayed["legal_balls"]
        current_over_number = legal_balls_so_far // 6
        ball_in_over = (legal_balls_so_far % 6) + 1

        effects = CricketEngine.process_delivery_effects(
            delivery_type=req.delivery_type,
            bat_runs=req.bat_runs,
            extra_runs=req.extra_runs,
            is_free_hit=is_free_hit
        )

        delivery_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO deliveries (
                id, innings_id, over_number, ball_in_over, legal_ball_number,
                bowler_id, striker_id, non_striker_id, delivery_type,
                bat_runs, extra_runs, extra_type, total_delivery_runs,
                is_legal, is_free_hit, is_boundary_4, is_boundary_6, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            delivery_id, innings["id"], current_over_number, ball_in_over,
            legal_balls_so_far + (1 if effects["is_legal"] else 0),
            bowler_id, striker_id, non_striker_id, req.delivery_type,
            effects["bat_runs"], effects["extra_runs"], effects["extra_type"],
            effects["total_delivery_runs"], effects["is_legal"],
            is_free_hit, effects["is_boundary_4"], effects["is_boundary_6"],
            req.notes
        ))

        incoming_batsman = req.incoming_batsman_id
        if not incoming_batsman and req.dismissal_type != DISMISSAL_RETIRED_HURT:
            for b_cand in state["available_incoming"]:
                if b_cand["player_id"] != req.player_out_id:
                    incoming_batsman = b_cand["player_id"]
                    break

        wicket_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO wickets (
                id, delivery_id, innings_id, player_out_id, incoming_batsman_id, dismissal_type,
                bowler_id, fielder_id, wicketkeeper_id, runs_completed, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            wicket_id, delivery_id, innings["id"], req.player_out_id, incoming_batsman, req.dismissal_type,
            bowler_id, req.fielder_id, req.wicketkeeper_id, req.runs_completed, req.notes
        ))

        # Replay to compute state
        updated_state = get_live_state_helper(conn, match_id)
        up_replayed = updated_state["replayed"]

        # If incoming batsman provided, replace the dismissed batsman
        new_striker = up_replayed["current_striker_id"]
        new_non_striker = up_replayed["current_non_striker_id"]

        if req.incoming_batsman_id:
            if req.player_out_id == striker_id:
                new_striker = req.incoming_batsman_id
            else:
                new_non_striker = req.incoming_batsman_id

        cursor.execute("""
            UPDATE innings SET
                total_runs = ?, total_wickets = ?, legal_balls = ?,
                current_striker_id = ?, current_non_striker_id = ?, current_bowler_id = ?,
                previous_bowler_id = ?, free_hit_active = ?,
                status = ?
            WHERE id = ?
        """, (
            up_replayed["total_runs"], up_replayed["total_wickets"], up_replayed["legal_balls"],
            new_striker, new_non_striker, up_replayed["current_bowler_id"],
            up_replayed["previous_bowler_id"], up_replayed["free_hit_active"],
            "completed" if up_replayed["is_completed"] else "in_progress",
            innings["id"]
        ))

        if up_replayed["is_completed"]:
            if innings["innings_number"] == 1:
                cursor.execute("UPDATE matches SET status = 'innings_break' WHERE id = ?", (match_id,))
            else:
                cursor.execute("UPDATE matches SET status = 'completed' WHERE id = ?", (match_id,))

        return get_live_state_helper(conn, match_id)

@router.post("/bowler-change")
def change_bowler(match_id: str, req: BowlerChangeRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        state = get_live_state_helper(conn, match_id)
        innings = state["innings"]
        replayed = state["replayed"]

        if req.bowler_id == replayed["previous_bowler_id"] and len(state["eligible_bowlers"]) > 1:
            raise HTTPException(status_code=400, detail="A bowler cannot bowl consecutive overs.")

        cursor.execute("UPDATE innings SET current_bowler_id = ? WHERE id = ?", (req.bowler_id, innings["id"]))
        return get_live_state_helper(conn, match_id)

@router.post("/incoming-batsman")
def set_incoming_batsman(match_id: str, req: IncomingBatsmanRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        state = get_live_state_helper(conn, match_id)
        innings = state["innings"]

        # Check if any deliveries have been bowled in this innings
        cursor.execute("SELECT COUNT(*) as cnt FROM deliveries WHERE innings_id = ?", (innings["id"],))
        deliv_count = cursor.fetchone()["cnt"]

        if deliv_count == 0:
            if req.is_striker:
                cursor.execute("UPDATE innings SET opening_striker_id = ?, current_striker_id = ? WHERE id = ?", (req.batsman_id, req.batsman_id, innings["id"]))
            else:
                cursor.execute("UPDATE innings SET opening_non_striker_id = ?, current_non_striker_id = ? WHERE id = ?", (req.batsman_id, req.batsman_id, innings["id"]))
        else:
            if req.is_striker:
                cursor.execute("UPDATE innings SET current_striker_id = ? WHERE id = ?", (req.batsman_id, innings["id"]))
            else:
                cursor.execute("UPDATE innings SET current_non_striker_id = ? WHERE id = ?", (req.batsman_id, innings["id"]))

            # If there was a wicket in this innings, update the last wicket's incoming_batsman_id
            cursor.execute("""
                SELECT id FROM wickets
                WHERE innings_id = ?
                ORDER BY rowid DESC LIMIT 1
            """, (innings["id"],))
            last_w = cursor.fetchone()
            if last_w:
                cursor.execute("UPDATE wickets SET incoming_batsman_id = ? WHERE id = ?", (req.batsman_id, last_w["id"]))

        return get_live_state_helper(conn, match_id)

@router.post("/penalty")
def record_penalty(match_id: str, req: PenaltyRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        state = get_live_state_helper(conn, match_id)
        innings = state["innings"]
        replayed = state["replayed"]

        # Insert penalty delivery
        delivery_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO deliveries (
                id, innings_id, over_number, ball_in_over, legal_ball_number,
                bowler_id, striker_id, non_striker_id, delivery_type,
                bat_runs, extra_runs, extra_type, total_delivery_runs,
                is_legal, is_free_hit, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'penalty', 0, ?, 'penalty', ?, 0, 0, ?)
        """, (
            delivery_id, innings["id"], replayed["legal_balls"] // 6, (replayed["legal_balls"] % 6) + 1,
            replayed["legal_balls"], replayed["current_bowler_id"] or "",
            replayed["current_striker_id"] or "", replayed["current_non_striker_id"] or "",
            req.runs, req.runs, f"Penalty: {req.reason} to {req.receiving_team_id}"
        ))

        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'penalty_runs', ?, ?)
        """, (str(uuid.uuid4()), match_id, f"{req.runs} penalty runs awarded", json.dumps({"runs": req.runs, "reason": req.reason})))

        return get_live_state_helper(conn, match_id)

@router.post("/undo")
def undo_last_delivery(match_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        state = get_live_state_helper(conn, match_id)
        innings = state["innings"]

        cursor.execute("SELECT id FROM deliveries WHERE innings_id = ? ORDER BY rowid DESC LIMIT 1", (innings["id"],))
        last_d = cursor.fetchone()
        if not last_d:
            raise HTTPException(status_code=400, detail="No deliveries to undo")

        d_id = last_d["id"]
        cursor.execute("DELETE FROM wickets WHERE delivery_id = ?", (d_id,))
        cursor.execute("DELETE FROM deliveries WHERE id = ?", (d_id,))

        # Re-sync match & innings
        updated_state = get_live_state_helper(conn, match_id)
        up_replayed = updated_state["replayed"]
        cursor.execute("""
            UPDATE innings SET
                total_runs = ?, total_wickets = ?, legal_balls = ?,
                current_striker_id = ?, current_non_striker_id = ?, current_bowler_id = ?,
                previous_bowler_id = ?, free_hit_active = ?, status = 'in_progress'
            WHERE id = ?
        """, (
            up_replayed["total_runs"], up_replayed["total_wickets"], up_replayed["legal_balls"],
            up_replayed["current_striker_id"], up_replayed["current_non_striker_id"], up_replayed["current_bowler_id"],
            up_replayed["previous_bowler_id"], up_replayed["free_hit_active"],
            innings["id"]
        ))
        cursor.execute("UPDATE matches SET status = 'in_progress' WHERE id = ?", (match_id,))

        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'undo_delivery', 'Undid last delivery', ?)
        """, (str(uuid.uuid4()), match_id, json.dumps({"undone_delivery_id": d_id})))

        return get_live_state_helper(conn, match_id)

@router.put("/deliveries/{delivery_id}")
def edit_historical_delivery(match_id: str, delivery_id: str, req: DeliveryEditRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM deliveries WHERE id = ?", (delivery_id,))
        deliv = cursor.fetchone()
        if not deliv:
            raise HTTPException(status_code=404, detail="Delivery not found")

        effects = CricketEngine.process_delivery_effects(
            delivery_type=req.delivery_type,
            bat_runs=req.bat_runs,
            extra_runs=req.extra_runs
        )

        cursor.execute("""
            UPDATE deliveries SET
                delivery_type = ?, bat_runs = ?, extra_runs = ?, extra_type = ?,
                total_delivery_runs = ?, is_legal = ?, is_boundary_4 = ?, is_boundary_6 = ?, notes = ?
            WHERE id = ?
        """, (
            req.delivery_type, effects["bat_runs"], effects["extra_runs"], effects["extra_type"],
            effects["total_delivery_runs"], effects["is_legal"], effects["is_boundary_4"], effects["is_boundary_6"],
            req.notes, delivery_id
        ))

        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'edit_delivery', 'Edited historical delivery', ?)
        """, (str(uuid.uuid4()), match_id, json.dumps({"delivery_id": delivery_id, "new_runs": effects["total_delivery_runs"]})))

        return get_live_state_helper(conn, match_id)

@router.delete("/deliveries/{delivery_id}")
def delete_historical_delivery(match_id: str, delivery_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM wickets WHERE delivery_id = ?", (delivery_id,))
        cursor.execute("DELETE FROM deliveries WHERE id = ?", (delivery_id,))

        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'delete_delivery', 'Deleted historical delivery', ?)
        """, (str(uuid.uuid4()), match_id, json.dumps({"deleted_delivery_id": delivery_id})))

        return get_live_state_helper(conn, match_id)

@router.post("/innings/next")
def start_second_innings(match_id: str, req: StartSecondInningsRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match = dict(cursor.fetchone())

        # Close innings 1
        cursor.execute("SELECT * FROM innings WHERE match_id = ? AND innings_number = 1", (match_id,))
        inn1 = dict(cursor.fetchone())
        cursor.execute("UPDATE innings SET status = 'completed' WHERE id = ?", (inn1["id"],))

        target = inn1["total_runs"] + 1

        # Check if 2nd innings already exists
        cursor.execute("SELECT * FROM innings WHERE match_id = ? AND innings_number = 2", (match_id,))
        inn2 = cursor.fetchone()
        if inn2:
            innings2_id = inn2["id"]
            cursor.execute("""
                UPDATE innings SET
                    status = 'in_progress', target = ?,
                    current_striker_id = ?, current_non_striker_id = ?, current_bowler_id = ?
                WHERE id = ?
            """, (target, req.opening_striker_id, req.opening_non_striker_id, req.opening_bowler_id, innings2_id))
        else:
            innings2_id = str(uuid.uuid4())
            # Reverse teams
            cursor.execute("""
                INSERT INTO innings (
                    id, match_id, innings_number, batting_team_id, bowling_team_id,
                    total_runs, total_wickets, legal_balls, target, status,
                    opening_striker_id, opening_non_striker_id, opening_bowler_id,
                    current_striker_id, current_non_striker_id, current_bowler_id
                ) VALUES (?, ?, 2, ?, ?, 0, 0, 0, ?, 'in_progress', ?, ?, ?, ?, ?, ?)
            """, (
                innings2_id, match_id, inn1["bowling_team_id"], inn1["batting_team_id"],
                target, req.opening_striker_id, req.opening_non_striker_id, req.opening_bowler_id,
                req.opening_striker_id, req.opening_non_striker_id, req.opening_bowler_id
            ))

        cursor.execute("UPDATE matches SET status = 'in_progress', current_innings_id = ? WHERE id = ?", (innings2_id, match_id))

        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'start_2nd_innings', 'Second innings started', ?)
        """, (str(uuid.uuid4()), match_id, json.dumps({"target": target})))

        return get_live_state_helper(conn, match_id)

@router.post("/manual-correction")
def apply_manual_correction(match_id: str, req: ManualCorrectionRequest):
    """Allows manual override of scores, extras, player statistics with full audit history"""
    with get_db() as conn:
        cursor = conn.cursor()
        override_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO manual_overrides (id, match_id, target_type, target_id, field_name, new_value, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (override_id, match_id, req.target_type, req.target_id, req.field_name, str(req.new_value), req.reason))

        cursor.execute("""
            INSERT INTO audit_logs (id, match_id, action_type, description, details_json)
            VALUES (?, ?, 'manual_override', ?, ?)
        """, (
            str(uuid.uuid4()), match_id,
            f"Override: {req.target_type}.{req.field_name} set to {req.new_value}. Reason: {req.reason}",
            json.dumps(req.dict())
        ))

        return {"message": "Manual correction recorded successfully", "override_id": override_id}
