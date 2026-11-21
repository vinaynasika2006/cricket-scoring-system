import pytest
from engine import (
    CricketEngine, balls_to_overs_str, validate_dismissal_rule,
    DISMISSAL_BOWLED, DISMISSAL_CAUGHT, DISMISSAL_STUMPED,
    DISMISSAL_RUN_OUT, DISMISSAL_LBW, DISMISSAL_RETIRED_HURT
)

def make_dummy_players():
    batting = [{"id": f"bat_{i}", "name": f"Batsman {i}"} for i in range(1, 12)]
    bowling = [{"id": f"bowl_{i}", "name": f"Bowler {i}"} for i in range(1, 12)]
    return batting, bowling

def dummy_innings_info(striker_id="bat_1", non_striker_id="bat_2", bowler_id="bowl_1"):
    return {
        "current_striker_id": striker_id,
        "current_non_striker_id": non_striker_id,
        "current_bowler_id": bowler_id,
        "previous_bowler_id": None
    }

def test_1_normal_scoring_0_to_6():
    """1. Normal scoring from 0 to 6."""
    for runs in range(7):
        eff = CricketEngine.process_delivery_effects("normal", bat_runs=runs)
        assert eff["is_legal"] is True
        assert eff["bat_runs"] == runs
        assert eff["extra_runs"] == 0
        assert eff["total_delivery_runs"] == runs
        assert eff["bowler_runs_charge"] == runs
        assert eff["striker_ball_faced"] is True

def test_2_odd_and_even_strike_rotation():
    """2. Odd and even run strike rotation."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    match_settings = {"total_overs": 5, "max_overs_per_bowler": 2}

    # Single run (odd) -> striker and non-striker should swap
    deliv_single = [{
        "id": "d1", "over_number": 0, "bowler_id": "bowl_1",
        "striker_id": "bat_1", "non_striker_id": "bat_2",
        "delivery_type": "normal", "bat_runs": 1, "extra_runs": 0, "is_legal": True
    }]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, deliv_single, [], match_settings)
    assert rep["current_striker_id"] == "bat_2"
    assert rep["current_non_striker_id"] == "bat_1"

    # Two runs (even) -> strike should not swap
    deliv_two = [{
        "id": "d1", "over_number": 0, "bowler_id": "bowl_1",
        "striker_id": "bat_1", "non_striker_id": "bat_2",
        "delivery_type": "normal", "bat_runs": 2, "extra_runs": 0, "is_legal": True
    }]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, deliv_two, [], match_settings)
    assert rep["current_striker_id"] == "bat_1"
    assert rep["current_non_striker_id"] == "bat_2"

def test_3_over_completion():
    """3. Over completion (6 legal balls completes over and rotates strike)."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    match_settings = {"total_overs": 5, "max_overs_per_bowler": 2}

    delivs = []
    # 6 dot balls in over 0
    for i in range(6):
        delivs.append({
            "id": f"d_{i}", "over_number": 0, "bowler_id": "bowl_1",
            "striker_id": "bat_1", "non_striker_id": "bat_2",
            "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True
        })
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], match_settings)
    assert rep["legal_balls"] == 6
    assert rep["overs_str"] == "1.0"
    assert rep["is_over_complete"] is True
    # At end of over, striker & non-striker swap ends!
    assert rep["current_striker_id"] == "bat_2"
    assert rep["current_non_striker_id"] == "bat_1"
    assert rep["previous_bowler_id"] == "bowl_1"

def test_4_wide_with_additional_runs():
    """4. Wide with additional runs."""
    # Wide + 2 ran by batsmen = 3 total runs, 0 legal balls, charged to bowler
    eff = CricketEngine.process_delivery_effects("wide", extra_runs=2)
    assert eff["is_legal"] is False
    assert eff["extra_runs"] == 3 # 1 wide penalty + 2 additional
    assert eff["total_delivery_runs"] == 3
    assert eff["bowler_runs_charge"] == 3
    assert eff["striker_ball_faced"] is False
    assert eff["runs_for_strike_rotation"] == 2 # 2 runs ran by batsmen

def test_5_no_ball_with_runs_off_the_bat():
    """5. No-ball with runs off the bat."""
    # NB + 1 off bat = 2 runs total, batsman gets 1 run and faces 1 ball
    eff = CricketEngine.process_delivery_effects("no_ball", bat_runs=1)
    assert eff["is_legal"] is False
    assert eff["bat_runs"] == 1
    assert eff["extra_runs"] == 1 # penalty
    assert eff["total_delivery_runs"] == 2
    assert eff["bowler_runs_charge"] == 2
    assert eff["striker_ball_faced"] is True
    assert eff["triggers_free_hit"] is True

def test_6_no_ball_boundary_allowance():
    """6. No-ball boundary allowance (NB + 4)."""
    eff = CricketEngine.process_delivery_effects("no_ball", bat_runs=4)
    assert eff["is_legal"] is False
    assert eff["bat_runs"] == 4
    assert eff["extra_runs"] == 1
    assert eff["total_delivery_runs"] == 5
    assert eff["is_boundary_4"] is True
    assert eff["bowler_runs_charge"] == 5

def test_7_bye_and_leg_bye():
    """7. Bye and leg-bye: legal ball, not charged to bowler, not credited to batsman."""
    eff_bye = CricketEngine.process_delivery_effects("bye", extra_runs=2)
    assert eff_bye["is_legal"] is True
    assert eff_bye["bat_runs"] == 0
    assert eff_bye["extra_runs"] == 2
    assert eff_bye["bowler_runs_charge"] == 0
    assert eff_bye["striker_ball_faced"] is True

    eff_lb = CricketEngine.process_delivery_effects("leg_bye", extra_runs=1)
    assert eff_lb["is_legal"] is True
    assert eff_lb["bat_runs"] == 0
    assert eff_lb["extra_runs"] == 1
    assert eff_lb["bowler_runs_charge"] == 0

def test_8_wicket_by_bowled():
    """8. Wicket by Bowled credited to bowler."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [{
        "id": "d_w1", "over_number": 0, "bowler_id": "bowl_1",
        "striker_id": "bat_1", "non_striker_id": "bat_2",
        "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True
    }]
    wickets = [{
        "id": "w1", "delivery_id": "d_w1", "innings_id": "inn_1",
        "player_out_id": "bat_1", "dismissal_type": DISMISSAL_BOWLED,
        "bowler_id": "bowl_1"
    }]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, wickets, {"total_overs": 5})
    assert rep["total_wickets"] == 1
    b1_stat = next(b for b in rep["batsman_stats"] if b["player_id"] == "bat_1")
    assert b1_stat["status"] == "out"
    assert b1_stat["dismissal"] == "b Bowler 1"
    bw_stat = next(b for b in rep["bowler_stats"] if b["player_id"] == "bowl_1")
    assert bw_stat["wickets"] == 1

def test_9_wicket_by_caught():
    """9. Wicket by Caught with fielder."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [{
        "id": "d_c1", "over_number": 0, "bowler_id": "bowl_1",
        "striker_id": "bat_1", "non_striker_id": "bat_2",
        "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True
    }]
    wickets = [{
        "id": "w1", "delivery_id": "d_c1", "innings_id": "inn_1",
        "player_out_id": "bat_1", "dismissal_type": DISMISSAL_CAUGHT,
        "bowler_id": "bowl_1", "fielder_id": "bowl_2"
    }]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, wickets, {"total_overs": 5})
    b1_stat = next(b for b in rep["batsman_stats"] if b["player_id"] == "bat_1")
    assert b1_stat["dismissal"] == "c Bowler 2 b Bowler 1"

def test_10_wicket_by_stumped():
    """10. Wicket by Stumped with wicketkeeper."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [{
        "id": "d_st1", "over_number": 0, "bowler_id": "bowl_1",
        "striker_id": "bat_1", "non_striker_id": "bat_2",
        "delivery_type": "wide", "bat_runs": 0, "extra_runs": 0, "is_legal": False
    }]
    wickets = [{
        "id": "w1", "delivery_id": "d_st1", "innings_id": "inn_1",
        "player_out_id": "bat_1", "dismissal_type": DISMISSAL_STUMPED,
        "bowler_id": "bowl_1", "wicketkeeper_id": "bowl_3"
    }]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, wickets, {"total_overs": 5})
    b1_stat = next(b for b in rep["batsman_stats"] if b["player_id"] == "bat_1")
    assert b1_stat["dismissal"] == "st Bowler 3 b Bowler 1"

def test_11_run_out_with_completed_runs():
    """11. Run Out with completed runs (bowler NOT credited)."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [{
        "id": "d_ro1", "over_number": 0, "bowler_id": "bowl_1",
        "striker_id": "bat_1", "non_striker_id": "bat_2",
        "delivery_type": "normal", "bat_runs": 1, "extra_runs": 0, "is_legal": True
    }]
    wickets = [{
        "id": "w1", "delivery_id": "d_ro1", "innings_id": "inn_1",
        "player_out_id": "bat_2", "dismissal_type": DISMISSAL_RUN_OUT,
        "fielder_id": "bowl_4", "runs_completed": 1
    }]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, wickets, {"total_overs": 5})
    assert rep["total_runs"] == 1
    assert rep["total_wickets"] == 1
    # Bowler should NOT receive wicket credit for run out
    bw_stat = next(b for b in rep["bowler_stats"] if b["player_id"] == "bowl_1")
    assert bw_stat["wickets"] == 0

def test_12_wicket_restrictions_on_no_balls():
    """12. Wicket restrictions on no-balls (e.g. bowled/caught disallowed)."""
    valid_b, _ = validate_dismissal_rule(DISMISSAL_BOWLED, is_no_ball=True, is_free_hit=False, is_wide=False)
    assert valid_b is False
    valid_c, _ = validate_dismissal_rule(DISMISSAL_CAUGHT, is_no_ball=True, is_free_hit=False, is_wide=False)
    assert valid_c is False
    valid_ro, _ = validate_dismissal_rule(DISMISSAL_RUN_OUT, is_no_ball=True, is_free_hit=False, is_wide=False)
    assert valid_ro is True

def test_13_wicket_restrictions_on_wides():
    """13. Wicket restrictions on wides (e.g. lbw disallowed, stumped/run out allowed)."""
    valid_lbw, _ = validate_dismissal_rule(DISMISSAL_LBW, is_no_ball=False, is_free_hit=False, is_wide=True)
    assert valid_lbw is False
    valid_st, _ = validate_dismissal_rule(DISMISSAL_STUMPED, is_no_ball=False, is_free_hit=False, is_wide=True)
    assert valid_st is True
    valid_ro, _ = validate_dismissal_rule(DISMISSAL_RUN_OUT, is_no_ball=False, is_free_hit=False, is_wide=True)
    assert valid_ro is True

def test_14_free_hit_continuation():
    """14. Free-hit continuation if next ball is wide or no-ball."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [
        # Ball 1: No ball triggers free hit
        {"id": "d1", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
         "delivery_type": "no_ball", "bat_runs": 0, "extra_runs": 0, "is_free_hit": False, "is_legal": False},
        # Ball 2: Wide while free hit is active -> free hit continues!
        {"id": "d2", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
         "delivery_type": "wide", "bat_runs": 0, "extra_runs": 0, "is_free_hit": True, "is_legal": False},
    ]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], {"total_overs": 5})
    assert rep["free_hit_active"] is True

def test_15_bowler_changes_consecutive_overs():
    """15. Bowler changes and previous bowler detection."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [{"id": f"d_{i}", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
               "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True} for i in range(6)]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], {"total_overs": 5})
    assert rep["previous_bowler_id"] == "bowl_1"

def test_16_maiden_overs():
    """16. Maiden overs (6 legal balls, 0 runs conceded by bowler)."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    # Over 0: 6 dots -> maiden
    delivs = [{"id": f"d_{i}", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
               "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True} for i in range(6)]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], {"total_overs": 5})
    bw_stat = next(b for b in rep["bowler_stats"] if b["player_id"] == "bowl_1")
    assert bw_stat["maidens"] == 1

def test_17_all_out_innings_completion():
    """17. 10 wickets falls triggers All Out innings completion."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = []
    wickets = []
    for i in range(1, 11):
        d_id = f"d_w_{i}"
        delivs.append({"id": d_id, "over_number": (i-1)//6, "bowler_id": "bowl_1", "striker_id": f"bat_{i}", "non_striker_id": "bat_11",
                       "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True})
        wickets.append({"id": f"w_{i}", "delivery_id": d_id, "player_out_id": f"bat_{i}", "dismissal_type": DISMISSAL_BOWLED, "bowler_id": "bowl_1"})
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, wickets, {"total_overs": 20})
    assert rep["total_wickets"] == 10
    assert rep["all_out"] is True
    assert rep["is_completed"] is True

def test_18_target_reached_won_by_wickets():
    """18. Target reached and victory by wickets in 2nd innings."""
    inn1 = {"total_runs": 150}
    inn2 = {"total_runs": 151, "total_wickets": 4, "is_completed": True}
    res = CricketEngine.calculate_match_result(inn1, inn2, "India", "Australia", "India", "Australia", 20)
    assert res["is_finished"] is True
    assert res["winner"] == "Australia"
    assert res["result_type"] == "wickets"
    assert res["margin"] == 6 # 10 - 4
    assert res["summary"] == "Australia won by 6 wickets"

def test_19_innings_completed_won_by_runs():
    """19. Innings completed below target -> victory by runs."""
    inn1 = {"total_runs": 180}
    inn2 = {"total_runs": 156, "total_wickets": 10, "is_completed": True}
    res = CricketEngine.calculate_match_result(inn1, inn2, "India", "Australia", "India", "Australia", 20)
    assert res["is_finished"] is True
    assert res["winner"] == "India"
    assert res["result_type"] == "runs"
    assert res["margin"] == 24 # 180 - 156
    assert res["summary"] == "India won by 24 runs"

def test_20_tied_match():
    """20. Equal scores -> Match Tied."""
    inn1 = {"total_runs": 150}
    inn2 = {"total_runs": 150, "total_wickets": 8, "is_completed": True}
    res = CricketEngine.calculate_match_result(inn1, inn2, "India", "Australia", "India", "Australia", 20, super_over_enabled=True)
    assert res["is_finished"] is True
    assert res["result_type"] == "tied"
    assert "Match Tied" in res["summary"]

def test_21_22_replay_editing_and_undo():
    """21 & 22. Manual delivery editing and undo with full deterministic recalculation."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [
        {"id": "d1", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
         "delivery_type": "normal", "bat_runs": 4, "extra_runs": 0, "is_legal": True},
        {"id": "d2", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
         "delivery_type": "normal", "bat_runs": 6, "extra_runs": 0, "is_legal": True}
    ]
    # Total before edit = 10
    rep1 = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], {"total_overs": 5})
    assert rep1["total_runs"] == 10

    # Edit: Change d1 from 4 to 1
    delivs[0]["bat_runs"] = 1
    rep2 = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], {"total_overs": 5})
    assert rep2["total_runs"] == 7
    # Since d1 was 1 run, strike rotated, so d2 was faced by bat_2!
    b1_stat = next(b for b in rep2["batsman_stats"] if b["player_id"] == "bat_1")
    assert b1_stat["runs"] == 1

    # Undo: Remove d2
    delivs.pop()
    rep3 = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, [], {"total_overs": 5})
    assert rep3["total_runs"] == 1
    assert rep3["legal_balls"] == 1

def test_23_retired_hurt_not_a_wicket():
    """23. Retired Hurt is recorded but does NOT increment the team wicket count."""
    batting, bowling = make_dummy_players()
    inn_info = dummy_innings_info()
    delivs = [{"id": "d_rh", "over_number": 0, "bowler_id": "bowl_1", "striker_id": "bat_1", "non_striker_id": "bat_2",
               "delivery_type": "normal", "bat_runs": 0, "extra_runs": 0, "is_legal": True}]
    wickets = [{"id": "w_rh", "delivery_id": "d_rh", "player_out_id": "bat_1", "dismissal_type": DISMISSAL_RETIRED_HURT}]
    rep = CricketEngine.replay_innings(inn_info, batting, bowling, delivs, wickets, {"total_overs": 5})
    assert rep["total_wickets"] == 0
    b1_stat = next(b for b in rep["batsman_stats"] if b["player_id"] == "bat_1")
    assert b1_stat["status"] == "retired_hurt"
