"""
Centralized Cricket Scoring Rules Engine
Deterministic, event-sourced, and compliant with the Laws of Cricket.
"""
from typing import Dict, List, Optional, Any, Tuple
import math

# Dismissal types
DISMISSAL_BOWLED = "bowled"
DISMISSAL_CAUGHT = "caught"
DISMISSAL_LBW = "lbw"
DISMISSAL_RUN_OUT = "run_out"
DISMISSAL_STUMPED = "stumped"
DISMISSAL_HIT_WICKET = "hit_wicket"
DISMISSAL_RETIRED_OUT = "retired_out"
DISMISSAL_RETIRED_HURT = "retired_hurt"
DISMISSAL_OBSTRUCTING = "obstructing_field"
DISMISSAL_HIT_BALL_TWICE = "hit_ball_twice"
DISMISSAL_TIMED_OUT = "timed_out"

# Bowler credited wickets
BOWLER_CREDITED_DISMISSALS = {
    DISMISSAL_BOWLED,
    DISMISSAL_CAUGHT,
    DISMISSAL_LBW,
    DISMISSAL_STUMPED,
    DISMISSAL_HIT_WICKET,
}

# Dismissals permitted on No-Ball or Free-Hit
NO_BALL_FREE_HIT_ALLOWED_DISMISSALS = {
    DISMISSAL_RUN_OUT,
    DISMISSAL_OBSTRUCTING,
    DISMISSAL_HIT_BALL_TWICE,
}

# Dismissals permitted on Wide
WIDE_ALLOWED_DISMISSALS = {
    DISMISSAL_RUN_OUT,
    DISMISSAL_STUMPED,
    DISMISSAL_HIT_WICKET,
    DISMISSAL_OBSTRUCTING,
}

def balls_to_overs_str(balls: int) -> str:
    """Converts legal balls to cricket notation, e.g. 15 -> '2.3'"""
    if balls < 0:
        return "0.0"
    overs = balls // 6
    remaining_balls = balls % 6
    return f"{overs}.{remaining_balls}"

def overs_str_to_balls(overs_str: str) -> int:
    """Converts cricket notation e.g. '2.3' -> 15 legal balls"""
    try:
        if "." in str(overs_str):
            parts = str(overs_str).split(".")
            return int(parts[0]) * 6 + int(parts[1])
        return int(overs_str) * 6
    except Exception:
        return 0

def calc_run_rate(runs: int, legal_balls: int) -> float:
    """Calculates run rate per 6 balls"""
    if legal_balls <= 0:
        return 0.0
    return round((runs / legal_balls) * 6.0, 2)

def calc_strike_rate(runs: int, balls_faced: int) -> float:
    """Calculates batting strike rate"""
    if balls_faced <= 0:
        return 0.0
    return round((runs / balls_faced) * 100.0, 2)

def calc_economy_rate(runs_conceded: int, legal_balls: int) -> float:
    """Calculates bowling economy rate"""
    if legal_balls <= 0:
        return 0.0
    return round((runs_conceded / legal_balls) * 6.0, 2)

def validate_dismissal_rule(dismissal_type: str, is_no_ball: bool, is_free_hit: bool, is_wide: bool) -> Tuple[bool, str]:
    """Validates if a dismissal is allowed under current ball conditions"""
    if is_no_ball or is_free_hit:
        if dismissal_type not in NO_BALL_FREE_HIT_ALLOWED_DISMISSALS:
            reason = "Free Hit" if is_free_hit else "No Ball"
            return False, f"Batsman cannot be dismissed '{dismissal_type}' on a {reason}. Only Run Out, Obstructing the Field, and Hit Ball Twice are permitted."
    
    if is_wide:
        if dismissal_type not in WIDE_ALLOWED_DISMISSALS:
            return False, f"Batsman cannot be dismissed '{dismissal_type}' on a Wide. Only Run Out, Stumped, Hit Wicket, and Obstructing the Field are permitted."
            
    return True, ""

class CricketEngine:
    @staticmethod
    def process_delivery_effects(
        delivery_type: str,
        bat_runs: int = 0,
        extra_runs: int = 0,
        is_free_hit: bool = False,
        free_hit_rule_enabled: bool = True
    ) -> Dict[str, Any]:
        """
        Determines the immediate numeric impact of a delivery:
        - is_legal
        - total_runs
        - bat_runs
        - extra_runs
        - extra_type
        - bowler_runs_charge
        - striker_ball_faced
        - runs_for_strike_rotation
        - triggers_free_hit
        - next_free_hit_state
        """
        is_legal = True
        calc_bat_runs = 0
        calc_extra_runs = 0
        extra_type = None
        bowler_runs_charge = 0
        striker_ball_faced = True
        runs_for_strike_rotation = 0
        triggers_free_hit = False
        next_free_hit_state = False

        if delivery_type == "normal":
            is_legal = True
            calc_bat_runs = max(0, bat_runs)
            calc_extra_runs = 0
            bowler_runs_charge = calc_bat_runs
            striker_ball_faced = True
            runs_for_strike_rotation = calc_bat_runs
            # Free hit consumed on legal ball
            next_free_hit_state = False

        elif delivery_type == "wide":
            is_legal = False
            calc_bat_runs = 0
            # 1 penalty run + any additional runs
            calc_extra_runs = 1 + max(0, extra_runs)
            extra_type = "wide"
            bowler_runs_charge = calc_extra_runs
            striker_ball_faced = False # Wides do not count towards balls faced
            runs_for_strike_rotation = max(0, extra_runs) # completed runs ran by batsmen
            # If current ball was free hit, it carries over because delivery was illegal
            next_free_hit_state = is_free_hit

        elif delivery_type == "no_ball":
            is_legal = False
            calc_bat_runs = max(0, bat_runs)
            # 1 penalty run + extra runs (e.g. byes/leg-byes off no ball)
            calc_extra_runs = 1 + max(0, extra_runs)
            extra_type = "no_ball"
            bowler_runs_charge = 1 + calc_bat_runs + max(0, extra_runs)
            striker_ball_faced = True # No balls count as balls faced
            runs_for_strike_rotation = calc_bat_runs + max(0, extra_runs)
            if free_hit_rule_enabled:
                triggers_free_hit = True
                next_free_hit_state = True
            else:
                next_free_hit_state = False

        elif delivery_type == "bye":
            is_legal = True
            calc_bat_runs = 0
            calc_extra_runs = max(1, extra_runs or bat_runs)
            extra_type = "bye"
            bowler_runs_charge = 0 # Byes are not charged to bowler
            striker_ball_faced = True
            runs_for_strike_rotation = calc_extra_runs
            next_free_hit_state = False

        elif delivery_type == "leg_bye":
            is_legal = True
            calc_bat_runs = 0
            calc_extra_runs = max(1, extra_runs or bat_runs)
            extra_type = "leg_bye"
            bowler_runs_charge = 0 # Leg byes are not charged to bowler
            striker_ball_faced = True
            runs_for_strike_rotation = calc_extra_runs
            next_free_hit_state = False

        elif delivery_type == "penalty":
            is_legal = False
            calc_bat_runs = 0
            calc_extra_runs = max(1, extra_runs)
            extra_type = "penalty"
            bowler_runs_charge = 0
            striker_ball_faced = False
            runs_for_strike_rotation = 0
            next_free_hit_state = is_free_hit

        total_delivery_runs = calc_bat_runs + calc_extra_runs

        return {
            "is_legal": is_legal,
            "bat_runs": calc_bat_runs,
            "extra_runs": calc_extra_runs,
            "extra_type": extra_type,
            "total_delivery_runs": total_delivery_runs,
            "bowler_runs_charge": bowler_runs_charge,
            "striker_ball_faced": striker_ball_faced,
            "runs_for_strike_rotation": runs_for_strike_rotation,
            "triggers_free_hit": triggers_free_hit,
            "next_free_hit_state": next_free_hit_state,
            "is_boundary_4": (calc_bat_runs == 4 and delivery_type in ("normal", "no_ball")),
            "is_boundary_6": (calc_bat_runs == 6 and delivery_type in ("normal", "no_ball")),
        }

    @staticmethod
    def replay_innings(
        innings_info: Dict[str, Any],
        batting_players: List[Dict[str, Any]],
        bowling_players: List[Dict[str, Any]],
        deliveries: List[Dict[str, Any]],
        wickets: List[Dict[str, Any]],
        match_settings: Dict[str, Any],
        target: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Pure deterministic replay of an entire innings from scratch.
        Recalculates:
        - Batting scorecard (Runs, Balls, 4s, 6s, SR, Status, Dismissal details)
        - Bowling scorecard (Overs, Maidens, Runs, Wickets, Economy, NB, WD)
        - Over-by-over log and maiden over detection
        - Fall of wickets with partnerships
        - Extras breakdown (Byes, Leg byes, Wides, No balls, Penalties)
        - Team total, wickets, legal balls, overs string
        - Current active striker, non-striker, bowler, over state (is over completed?)
        - Free-hit active status
        - Result if target reached or innings completed
        """
        total_overs = match_settings.get("total_overs", 20)
        max_overs_per_bowler = match_settings.get("max_overs_per_bowler", math.ceil(total_overs / 5))
        free_hit_rule_enabled = match_settings.get("free_hit_enabled", True)
        total_batting_players_count = len(batting_players)
        max_wickets = max(1, total_batting_players_count - 1)

        # Index players
        batting_map = {p["id"]: dict(p) for p in batting_players}
        bowling_map = {p["id"]: dict(p) for p in bowling_players}

        # Initialize Batting Stats
        batsman_stats = {}
        for p in batting_players:
            pid = p["id"]
            batsman_stats[pid] = {
                "player_id": pid,
                "name": p["name"],
                "runs": 0,
                "balls_faced": 0,
                "fours": 0,
                "sixes": 0,
                "strike_rate": 0.0,
                "status": "not_out", # 'not_out', 'batting', 'out', 'retired_hurt', 'retired_out'
                "dismissal": "not out",
                "dismissal_type": None,
                "bowler_name": None,
                "fielder_name": None,
            }

        # Initialize Bowling Stats
        bowler_stats = {}
        for p in bowling_players:
            pid = p["id"]
            bowler_stats[pid] = {
                "player_id": pid,
                "name": p["name"],
                "legal_balls": 0,
                "overs_str": "0.0",
                "maidens": 0,
                "runs_conceded": 0,
                "wickets": 0,
                "economy": 0.0,
                "wides": 0,
                "no_balls": 0,
                "overs_bowled_list": [], # tracking runs conceded per over
            }

        # Extras breakdown
        extras = {
            "byes": 0,
            "leg_byes": 0,
            "wides": 0,
            "no_balls": 0,
            "penalty": 0,
            "total": 0
        }

        # Wickets map by delivery_id
        wicket_by_delivery = {}
        for w in wickets:
            deliv_id = w.get("delivery_id")
            if deliv_id:
                wicket_by_delivery[deliv_id] = w

        total_runs = 0
        total_wickets = 0
        legal_balls = 0
        fall_of_wickets = []
        recent_balls = []

        # Current on-field positions starting from opening or initial
        striker_id = innings_info.get("opening_striker_id") or innings_info.get("current_striker_id")
        non_striker_id = innings_info.get("opening_non_striker_id") or innings_info.get("current_non_striker_id")
        current_bowler_id = innings_info.get("opening_bowler_id") or innings_info.get("current_bowler_id")
        previous_bowler_id = innings_info.get("previous_bowler_id")
        free_hit_active = False

        if striker_id and striker_id in batsman_stats:
            batsman_stats[striker_id]["status"] = "batting"
        if non_striker_id and non_striker_id in batsman_stats:
            batsman_stats[non_striker_id]["status"] = "batting"

        # Track overs structure
        # over_tracker[over_index] = { bowler_id, legal_balls, runs_conceded, deliveries: [] }
        overs_map: Dict[int, Dict[str, Any]] = {}
        partnership_runs = 0

        # Process each delivery in order
        for delivery in deliveries:
            d_id = delivery.get("id")
            over_num = delivery.get("over_number", 0)
            d_bowler_id = delivery.get("bowler_id") or current_bowler_id
            d_striker_id = striker_id or delivery.get("striker_id")
            d_non_striker_id = non_striker_id or delivery.get("non_striker_id")
            d_type = delivery.get("delivery_type", "normal")
            d_bat_runs = delivery.get("bat_runs", 0)
            d_extra_runs = delivery.get("extra_runs", 0)
            d_is_free_hit = free_hit_active or bool(delivery.get("is_free_hit", False))

            if over_num not in overs_map:
                overs_map[over_num] = {
                    "over_number": over_num,
                    "bowler_id": d_bowler_id,
                    "legal_balls": 0,
                    "runs_conceded": 0,
                    "balls": [],
                }
            over_obj = overs_map[over_num]

            effects = CricketEngine.process_delivery_effects(
                delivery_type=d_type,
                bat_runs=d_bat_runs,
                extra_runs=d_extra_runs,
                is_free_hit=d_is_free_hit,
                free_hit_rule_enabled=free_hit_rule_enabled
            )

            # Update Extras
            if effects["extra_type"] == "wide":
                extras["wides"] += effects["extra_runs"]
                if d_bowler_id in bowler_stats:
                    bowler_stats[d_bowler_id]["wides"] += 1
            elif effects["extra_type"] == "no_ball":
                extras["no_balls"] += effects["extra_runs"]
                if d_bowler_id in bowler_stats:
                    bowler_stats[d_bowler_id]["no_balls"] += 1
            elif effects["extra_type"] == "bye":
                extras["byes"] += effects["extra_runs"]
            elif effects["extra_type"] == "leg_bye":
                extras["leg_byes"] += effects["extra_runs"]
            elif effects["extra_type"] == "penalty":
                extras["penalty"] += effects["extra_runs"]

            extras["total"] = (
                extras["byes"] + extras["leg_byes"] + extras["wides"] + extras["no_balls"] + extras["penalty"]
            )

            # Update team score
            total_runs += effects["total_delivery_runs"]
            partnership_runs += effects["total_delivery_runs"]

            # Update legal ball count
            if effects["is_legal"]:
                legal_balls += 1
                over_obj["legal_balls"] += 1

            # Update striker stats
            if d_striker_id in batsman_stats:
                b_stat = batsman_stats[d_striker_id]
                b_stat["status"] = "batting" if b_stat["status"] == "not_out" else b_stat["status"]
                b_stat["runs"] += effects["bat_runs"]
                if effects["striker_ball_faced"]:
                    b_stat["balls_faced"] += 1
                if effects["is_boundary_4"]:
                    b_stat["fours"] += 1
                if effects["is_boundary_6"]:
                    b_stat["sixes"] += 1
                b_stat["strike_rate"] = calc_strike_rate(b_stat["runs"], b_stat["balls_faced"])

            # Update bowler stats
            if d_bowler_id in bowler_stats:
                bw_stat = bowler_stats[d_bowler_id]
                if effects["is_legal"]:
                    bw_stat["legal_balls"] += 1
                    bw_stat["overs_str"] = balls_to_overs_str(bw_stat["legal_balls"])
                bw_stat["runs_conceded"] += effects["bowler_runs_charge"]
                over_obj["runs_conceded"] += effects["bowler_runs_charge"]
                bw_stat["economy"] = calc_economy_rate(bw_stat["runs_conceded"], bw_stat["legal_balls"])

            # Format delivery badge label for recent balls display
            badge_label = ""
            if d_type == "normal":
                badge_label = str(effects["bat_runs"])
            elif d_type == "wide":
                additional = d_extra_runs
                badge_label = f"WD+{additional}" if additional > 0 else "WD"
            elif d_type == "no_ball":
                add = effects["bat_runs"] + d_extra_runs
                badge_label = f"NB+{add}" if add > 0 else "NB"
            elif d_type == "bye":
                badge_label = f"B{effects['extra_runs']}"
            elif d_type == "leg_bye":
                badge_label = f"LB{effects['extra_runs']}"
            elif d_type == "penalty":
                badge_label = f"PEN{effects['extra_runs']}"

            # Check Wicket on this delivery
            w_data = wicket_by_delivery.get(d_id)
            if w_data:
                d_type_w = w_data.get("dismissal_type")
                out_player_id = w_data.get("player_out_id")
                w_bowler_id = w_data.get("bowler_id") or d_bowler_id
                fielder_id = w_data.get("fielder_id")
                keeper_id = w_data.get("wicketkeeper_id")

                badge_label = "W" if badge_label in ("0", "1") else f"W+{badge_label}"

                if d_type_w != DISMISSAL_RETIRED_HURT:
                    total_wickets += 1

                # Update bowler wickets if credited
                if d_type_w in BOWLER_CREDITED_DISMISSALS and d_bowler_id in bowler_stats:
                    bowler_stats[d_bowler_id]["wickets"] += 1

                # Formulate dismissal string
                f_name = bowling_map.get(fielder_id, {}).get("name", "") if fielder_id else ""
                k_name = bowling_map.get(keeper_id, {}).get("name", "") if keeper_id else ""
                b_name = bowling_map.get(w_bowler_id, {}).get("name", "") if w_bowler_id else ""

                dismissal_str = "out"
                if d_type_w == DISMISSAL_BOWLED:
                    dismissal_str = f"b {b_name}"
                elif d_type_w == DISMISSAL_CAUGHT:
                    if fielder_id and fielder_id == w_bowler_id:
                        dismissal_str = f"c & b {b_name}"
                    else:
                        dismissal_str = f"c {f_name} b {b_name}"
                elif d_type_w == DISMISSAL_LBW:
                    dismissal_str = f"lbw b {b_name}"
                elif d_type_w == DISMISSAL_STUMPED:
                    dismissal_str = f"st {k_name} b {b_name}"
                elif d_type_w == DISMISSAL_RUN_OUT:
                    dismissal_str = f"run out ({f_name})" if f_name else "run out"
                elif d_type_w == DISMISSAL_HIT_WICKET:
                    dismissal_str = f"hit wicket b {b_name}"
                elif d_type_w == DISMISSAL_RETIRED_OUT:
                    dismissal_str = "retired out"
                elif d_type_w == DISMISSAL_RETIRED_HURT:
                    dismissal_str = "retired hurt"
                elif d_type_w == DISMISSAL_OBSTRUCTING:
                    dismissal_str = "obstructing field"
                elif d_type_w == DISMISSAL_HIT_BALL_TWICE:
                    dismissal_str = "hit ball twice"
                elif d_type_w == DISMISSAL_TIMED_OUT:
                    dismissal_str = "timed out"

                if out_player_id in batsman_stats:
                    p_stat = batsman_stats[out_player_id]
                    p_stat["status"] = d_type_w if d_type_w == DISMISSAL_RETIRED_HURT else "out"
                    p_stat["dismissal"] = dismissal_str
                    p_stat["dismissal_type"] = d_type_w
                    p_stat["bowler_name"] = b_name
                    p_stat["fielder_name"] = f_name or k_name

                # Record Fall of Wicket if not retired hurt
                if d_type_w != DISMISSAL_RETIRED_HURT:
                    out_name = batting_map.get(out_player_id, {}).get("name", "Unknown")
                    fall_of_wickets.append({
                        "wicket_number": total_wickets,
                        "score": total_runs,
                        "overs": balls_to_overs_str(legal_balls),
                        "player_out_id": out_player_id,
                        "player_name": out_name,
                        "partnership_runs": partnership_runs
                    })
                    partnership_runs = 0

                # Replace the dismissed player on the crease with incoming batsman
                incoming_id = w_data.get("incoming_batsman_id")
                if not incoming_id and d_type_w != DISMISSAL_RETIRED_HURT:
                    for bp in batting_players:
                        bpid = bp["id"]
                        if bpid != striker_id and bpid != non_striker_id and batsman_stats.get(bpid, {}).get("status") == "not_out":
                            incoming_id = bpid
                            break

                if incoming_id and incoming_id in batsman_stats:
                    batsman_stats[incoming_id]["status"] = "batting"
                    if out_player_id == striker_id:
                        striker_id = incoming_id
                    elif out_player_id == non_striker_id:
                        non_striker_id = incoming_id

            recent_balls.append({
                "label": badge_label,
                "is_wicket": bool(w_data and w_data.get("dismissal_type") != DISMISSAL_RETIRED_HURT),
                "is_boundary": effects["is_boundary_4"] or effects["is_boundary_6"],
                "delivery_type": d_type,
                "runs": effects["total_delivery_runs"]
            })
            over_obj["balls"].append(badge_label)

            # Strike Rotation
            # Check physical runs ran
            completed_runs = effects["runs_for_strike_rotation"]
            if w_data and w_data.get("runs_completed") is not None:
                completed_runs = w_data.get("runs_completed")

            if completed_runs % 2 == 1:
                # Rotate strike
                striker_id, non_striker_id = non_striker_id, striker_id

            # End of over strike rotation (after 6 legal deliveries)
            if over_obj["legal_balls"] == 6 and effects["is_legal"]:
                # Strike swaps ends at end of over
                striker_id, non_striker_id = non_striker_id, striker_id
                previous_bowler_id = d_bowler_id
                # current_bowler_id becomes unassigned or needs to be selected for next over

            # Free Hit state transition
            free_hit_active = effects["next_free_hit_state"]

        # Calculate maidens for each bowler
        for over_idx, ov in overs_map.items():
            if ov["legal_balls"] == 6 and ov["runs_conceded"] == 0:
                b_id = ov["bowler_id"]
                if b_id in bowler_stats:
                    bowler_stats[b_id]["maidens"] += 1

        overs_str = balls_to_overs_str(legal_balls)
        current_run_rate = calc_run_rate(total_runs, legal_balls)

        # Innings completion check
        is_completed = False
        target_reached = False
        all_out = (total_wickets >= max_wickets)
        max_balls_allowed = total_overs * 6
        overs_completed = (legal_balls >= max_balls_allowed)

        if target is not None and total_runs >= target:
            target_reached = True
            is_completed = True
        elif all_out or overs_completed:
            is_completed = True

        # Required run rate and target calculations if 2nd innings
        required_run_rate = 0.0
        runs_required = None
        balls_remaining = None

        if target is not None:
            runs_required = max(0, target - total_runs)
            balls_remaining = max(0, max_balls_allowed - legal_balls)
            if not target_reached and balls_remaining > 0:
                required_run_rate = round((runs_required / balls_remaining) * 6.0, 2)

        # Current over status: has the current over reached 6 legal balls?
        current_over_balls = legal_balls % 6
        is_over_complete = (len(deliveries) > 0 and current_over_balls == 0 and deliveries[-1].get("is_legal", True))

        # Safeguard: Ensure active striker and non-striker are never pointing to dismissed players
        if batsman_stats.get(striker_id, {}).get("status") in ("out", "retired_out") and not all_out:
            cand = innings_info.get("current_striker_id")
            if cand and batsman_stats.get(cand, {}).get("status") == "not_out" and cand != non_striker_id:
                striker_id = cand
            else:
                for bp in batting_players:
                    bpid = bp["id"]
                    if bpid != non_striker_id and batsman_stats.get(bpid, {}).get("status") == "not_out":
                        striker_id = bpid
                        break
            if striker_id and striker_id in batsman_stats:
                batsman_stats[striker_id]["status"] = "batting"

        if batsman_stats.get(non_striker_id, {}).get("status") in ("out", "retired_out") and not all_out:
            cand = innings_info.get("current_non_striker_id")
            if cand and batsman_stats.get(cand, {}).get("status") == "not_out" and cand != striker_id:
                non_striker_id = cand
            else:
                for bp in batting_players:
                    bpid = bp["id"]
                    if bpid != striker_id and batsman_stats.get(bpid, {}).get("status") == "not_out":
                        non_striker_id = bpid
                        break
            if non_striker_id and non_striker_id in batsman_stats:
                batsman_stats[non_striker_id]["status"] = "batting"

        return {
            "total_runs": total_runs,
            "total_wickets": total_wickets,
            "legal_balls": legal_balls,
            "overs_str": overs_str,
            "current_run_rate": current_run_rate,
            "target": target,
            "runs_required": runs_required,
            "balls_remaining": balls_remaining,
            "required_run_rate": required_run_rate,
            "is_completed": is_completed,
            "target_reached": target_reached,
            "all_out": all_out,
            "overs_completed": overs_completed,
            "is_over_complete": is_over_complete,
            "free_hit_active": free_hit_active,
            "current_striker_id": striker_id,
            "current_non_striker_id": non_striker_id,
            "current_bowler_id": current_bowler_id,
            "previous_bowler_id": previous_bowler_id,
            "batsman_stats": list(batsman_stats.values()),
            "bowler_stats": list(bowler_stats.values()),
            "extras": extras,
            "fall_of_wickets": fall_of_wickets,
            "recent_balls": recent_balls[-6:],
            "overs_breakdown": overs_map,
        }

    @staticmethod
    def calculate_match_result(
        innings1_state: Dict[str, Any],
        innings2_state: Optional[Dict[str, Any]],
        team1_name: str,
        team2_name: str,
        batting_first_team: str,
        batting_second_team: str,
        total_overs: int,
        format_type: str = "T20",
        super_over_enabled: bool = False
    ) -> Dict[str, Any]:
        """
        Determines the official match result following Laws of Cricket.
        """
        if not innings2_state or not innings2_state.get("is_completed"):
            return {
                "is_finished": False,
                "winner": None,
                "result_type": None,
                "margin": None,
                "summary": "Match in progress"
            }

        t1_runs = innings1_state["total_runs"]
        t2_runs = innings2_state["total_runs"]
        target = innings1_state["total_runs"] + 1

        if t2_runs >= target:
            # Chasing team won by wickets
            wickets_lost = innings2_state["total_wickets"]
            wickets_left = max(0, 10 - wickets_lost)
            summary = f"{batting_second_team} won by {wickets_left} wickets"
            return {
                "is_finished": True,
                "winner": batting_second_team,
                "result_type": "wickets",
                "margin": wickets_left,
                "summary": summary
            }
        elif t2_runs == t1_runs:
            # Tied
            summary = "Match Tied"
            if super_over_enabled:
                summary += " (Super Over Required)"
            return {
                "is_finished": True,
                "winner": None,
                "result_type": "tied",
                "margin": 0,
                "summary": summary
            }
        else:
            # Defending team won by runs
            margin = t1_runs - t2_runs
            summary = f"{batting_first_team} won by {margin} runs"
            return {
                "is_finished": True,
                "winner": batting_first_team,
                "result_type": "runs",
                "margin": margin,
                "summary": summary
            }
