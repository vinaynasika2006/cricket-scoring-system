import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from engine import CricketEngine

def test_engine():
    print("Testing CricketEngine...")

    # Mock innings info
    innings_info = {
        "id": "inn_1",
        "match_id": "m_1",
        "innings_number": 1,
        "batting_team_id": "team_ind",
        "bowling_team_id": "team_aus",
        "opening_striker_id": "p_rohit",
        "opening_non_striker_id": "p_jaiswal",
        "opening_bowler_id": "p_cummins",
        "current_striker_id": "p_rohit",
        "current_non_striker_id": "p_jaiswal",
        "current_bowler_id": "p_cummins",
        "status": "in_progress"
    }

    batting_players = [
        {"id": "p_rohit", "name": "Rohit Sharma", "batting_order": 1},
        {"id": "p_jaiswal", "name": "Yashasvi Jaiswal", "batting_order": 2},
        {"id": "p_kohli", "name": "Virat Kohli", "batting_order": 3},
        {"id": "p_sky", "name": "Suryakumar Yadav", "batting_order": 4},
    ]

    bowling_players = [
        {"id": "p_cummins", "name": "Pat Cummins"},
        {"id": "p_starc", "name": "Mitchell Starc"},
        {"id": "p_zampa", "name": "Adam Zampa"},
    ]

    match_settings = {
        "total_overs": 20,
        "max_overs_per_bowler": 4,
        "free_hit_enabled": True
    }

    # Test 1: 5 deliveries bowled by Cummins
    deliveries = []
    wickets = []
    for i in range(5):
        deliveries.append({
            "id": f"d_{i+1}",
            "innings_id": "inn_1",
            "over_number": 0,
            "ball_in_over": i + 1,
            "legal_ball_number": i + 1,
            "bowler_id": "p_cummins",
            "striker_id": "p_rohit",
            "non_striker_id": "p_jaiswal",
            "delivery_type": "normal",
            "bat_runs": 1,
            "extra_runs": 0,
            "total_runs": 1,
            "is_wicket": False,
            "wicket_type": None,
            "player_out_id": None,
            "dismissal_text": None,
            "runs_display": "1"
        })

    res = CricketEngine.replay_innings(innings_info, batting_players, bowling_players, deliveries, wickets, match_settings)
    assert res["overs_str"] == "0.5", f"Expected 0.5, got {res['overs_str']}"
    assert res["is_over_complete"] is False, "Over should not be complete at 5 balls"
    assert res["current_bowler_id"] == "p_cummins"
    print("Test 1 Passed: 5 balls -> 0.5 overs, bowler retained, over not complete")

    # Test 2: 6th delivery bowled to complete over
    deliveries.append({
        "id": "d_6",
        "innings_id": "inn_1",
        "over_number": 0,
        "ball_in_over": 6,
        "legal_ball_number": 6,
        "bowler_id": "p_cummins",
        "striker_id": "p_jaiswal",
        "non_striker_id": "p_rohit",
        "delivery_type": "normal",
        "bat_runs": 0,
        "extra_runs": 0,
        "total_runs": 0,
        "is_wicket": False,
        "wicket_type": None,
        "player_out_id": None,
        "dismissal_text": None,
        "runs_display": "0"
    })

    # At over complete, Cummins finished over 1. Cummins cannot bowl over 2 consecutive.
    res = CricketEngine.replay_innings(innings_info, batting_players, bowling_players, deliveries, wickets, match_settings)
    assert res["overs_str"] == "1.0", f"Expected 1.0, got {res['overs_str']}"
    assert res["is_over_complete"] is True, "Over must be marked complete after 6 legal balls"
    assert res["previous_bowler_id"] == "p_cummins", f"Expected previous bowler p_cummins, got {res['previous_bowler_id']}"
    assert res["current_bowler_id"] is None, f"Expected current_bowler_id to be None after over completes, got {res['current_bowler_id']}"
    print("Test 2 Passed: 6 balls -> 1.0 overs, is_over_complete=True, previous_bowler_id=p_cummins, current_bowler_id=None")

    # Test 3: Bowler changed to Starc for over 2
    innings_info_over2 = dict(innings_info)
    innings_info_over2["current_bowler_id"] = "p_starc"
    res = CricketEngine.replay_innings(innings_info_over2, batting_players, bowling_players, deliveries, wickets, match_settings)
    assert res["current_bowler_id"] == "p_starc", "Bowler should be Starc"
    assert res["is_over_complete"] is False, "Once new bowler is assigned, is_over_complete becomes False"
    print("Test 3 Passed: Changing bowler to Starc resets is_over_complete to False and sets active bowler")

    # Test 4: Wicket on next ball (p_rohit dismissed)
    deliveries.append({
        "id": "d_7",
        "innings_id": "inn_1",
        "over_number": 1,
        "ball_in_over": 1,
        "legal_ball_number": 7,
        "bowler_id": "p_starc",
        "striker_id": "p_rohit",
        "non_striker_id": "p_jaiswal",
        "delivery_type": "normal",
        "bat_runs": 0,
        "extra_runs": 0,
        "total_runs": 0,
        "is_wicket": True,
        "wicket_type": "bowled",
        "player_out_id": "p_rohit",
        "dismissal_text": "b Mitchell Starc",
        "runs_display": "W"
    })
    wickets.append({
        "id": "w_1",
        "innings_id": "inn_1",
        "delivery_id": "d_7",
        "wicket_type": "bowled",
        "player_out_id": "p_rohit",
        "bowler_id": "p_starc",
        "fielder_id": None,
        "incoming_batsman_id": "p_kohli"
    })

    res = CricketEngine.replay_innings(innings_info_over2, batting_players, bowling_players, deliveries, wickets, match_settings)
    rohit_stat = next(b for b in res["batsman_stats"] if b["player_id"] == "p_rohit")
    assert rohit_stat["status"] == "out", f"Expected Rohit status 'out', got {rohit_stat['status']}"
    assert res["current_striker_id"] == "p_kohli", f"Expected striker to be incoming Kohli, got {res['current_striker_id']}"
    assert res["current_non_striker_id"] == "p_jaiswal", f"Expected non-striker Jaiswal, got {res['current_non_striker_id']}"
    assert res["current_striker_id"] != res["current_non_striker_id"], "Striker and Non-Striker must be distinct!"
    print("Test 4 Passed: Rohit is marked 'out', Kohli is incoming striker, striker != non-striker")

    # Test 5: Safeguard against duplicate batsman on crease
    # If incoming_batsman_id was maliciously set to existing on-crease batter "p_jaiswal"
    wickets_corrupt = [{
        "id": "w_1",
        "innings_id": "inn_1",
        "delivery_id": "d_7",
        "wicket_type": "bowled",
        "player_out_id": "p_rohit",
        "bowler_id": "p_starc",
        "fielder_id": None,
        "incoming_batsman_id": "p_jaiswal"  # Same as non-striker!
    }]
    res_corrupt = CricketEngine.replay_innings(innings_info_over2, batting_players, bowling_players, deliveries, wickets_corrupt, match_settings)
    assert res_corrupt["current_striker_id"] != res_corrupt["current_non_striker_id"], "Safeguard must deduplicate crease batsmen!"
    print(f"Test 5 Passed: Safeguard auto-resolved duplicate: striker={res_corrupt['current_striker_id']}, non-striker={res_corrupt['current_non_striker_id']}")

    print("\nALL 5 CRICKET ENGINE UNIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_engine()
