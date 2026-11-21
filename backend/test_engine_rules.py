import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from starlette.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=== Running Rule Verification Tests ===")

    # 1. Create Match
    match_payload = {
        'title': 'Test Match Engine Verification',
        'format': 'T20',
        'total_overs': 20,
        'max_overs_per_bowler': 4,
        'team1': {
            'name': 'India',
            'short_name': 'IND',
            'players': [
                {'name': 'Rohit Sharma', 'batting_order': 1},
                {'name': 'Yashasvi Jaiswal', 'batting_order': 2},
                {'name': 'Virat Kohli', 'batting_order': 3},
                {'name': 'Suryakumar Yadav', 'batting_order': 4},
                {'name': 'Rishabh Pant', 'batting_order': 5},
                {'name': 'Hardik Pandya', 'batting_order': 6},
                {'name': 'Ravindra Jadeja', 'batting_order': 7},
                {'name': 'Axar Patel', 'batting_order': 8},
                {'name': 'Kuldeep Yadav', 'batting_order': 9},
                {'name': 'Jasprit Bumrah', 'batting_order': 10},
                {'name': 'Mohammed Siraj', 'batting_order': 11}
            ]
        },
        'team2': {
            'name': 'Australia',
            'short_name': 'AUS',
            'players': [
                {'name': 'Travis Head', 'batting_order': 1},
                {'name': 'David Warner', 'batting_order': 2},
                {'name': 'Mitchell Marsh', 'batting_order': 3},
                {'name': 'Glenn Maxwell', 'batting_order': 4},
                {'name': 'Marcus Stoinis', 'batting_order': 5},
                {'name': 'Tim David', 'batting_order': 6},
                {'name': 'Matthew Wade', 'batting_order': 7},
                {'name': 'Pat Cummins', 'batting_order': 8},
                {'name': 'Mitchell Starc', 'batting_order': 9},
                {'name': 'Adam Zampa', 'batting_order': 10},
                {'name': 'Josh Hazlewood', 'batting_order': 11}
            ]
        },
        'toss_winner': 'team1',
        'toss_decision': 'bat',
        'opening_striker_name': 'Rohit Sharma',
        'opening_non_striker_name': 'Yashasvi Jaiswal',
        'opening_bowler_name': 'Pat Cummins',
    }

    res = client.post("/api/matches", json=match_payload)
    assert res.status_code == 200, f"Match creation failed: {res.text}"
    match_data = res.json()
    match_id = match_data['id']
    print(f"1. Match created successfully: ID {match_id}")

    # Check live state
    res = client.get(f"/api/matches/{match_id}/live")
    assert res.status_code == 200
    live = res.json()
    assert live['striker']['name'] == 'Rohit Sharma'
    assert live['non_striker']['name'] == 'Yashasvi Jaiswal'
    assert live['bowler']['name'] == 'Pat Cummins'
    cummins_id = live['bowler']['player_id']
    rohit_id = live['striker']['player_id']
    jaiswal_id = live['non_striker']['player_id']
    print(f"2. Initial live state verified: Striker={live['striker']['name']}, Bowler={live['bowler']['name']}")

    # 2. Bowl 5 legal balls
    for i in range(5):
        res = client.post(f"/api/matches/{match_id}/deliveries", json={
            "delivery_type": "normal",
            "bat_runs": 1,
            "extra_runs": 0
        })
        assert res.status_code == 200, f"Ball {i+1} failed: {res.text}"

    live = client.get(f"/api/matches/{match_id}/live").json()
    assert live['replayed']['overs_str'] == '0.5'
    assert not live['replayed']['is_over_complete']
    print("3. Five balls bowled successfully (0.5 ov)")

    # 3. Bowl 6th legal ball to complete the over
    res = client.post(f"/api/matches/{match_id}/deliveries", json={
        "delivery_type": "normal",
        "bat_runs": 0,
        "extra_runs": 0
    })
    assert res.status_code == 200
    live = res.json()
    assert live['replayed']['overs_str'] == '1.0'
    assert live['replayed']['is_over_complete'] is True
    assert live['replayed']['previous_bowler_id'] == cummins_id
    assert live['bowler'] is None or live['bowler']['player_id'] != cummins_id
    print("4. Over 1 complete (1.0 ov) - Bowler reset and is_over_complete is True")

    # 4. Attempt to bowl next ball with Cummins without changing -> should fail Law 17.8
    res = client.post(f"/api/matches/{match_id}/deliveries", json={
        "delivery_type": "normal",
        "bat_runs": 0,
        "extra_runs": 0,
        "bowler_id": cummins_id
    })
    assert res.status_code == 400, f"Expected 400 when Cummins bowls consecutive overs, got {res.status_code}"
    print("5. Blocked consecutive over by previous bowler (Cummins) as required by Laws of Cricket")

    # Check eligible bowlers in over change modal
    assert len(live['eligible_bowlers']) > 0
    cummins_entry = next((b for b in live['eligible_bowlers'] if b['player_id'] == cummins_id), None)
    assert cummins_entry is not None
    assert cummins_entry['is_consecutive_blocked'] is True
    print("6. Eligible bowlers list marks Cummins as is_consecutive_blocked=True")

    # 5. Change bowler to Starc
    starc_entry = next((b for b in live['eligible_bowlers'] if b['name'] == 'Mitchell Starc'), None)
    assert starc_entry is not None
    res = client.post(f"/api/matches/{match_id}/bowler", json={"bowler_id": starc_entry['player_id']})
    assert res.status_code == 200
    live = res.json()
    assert live['bowler']['name'] == 'Mitchell Starc'
    assert not live['replayed']['is_over_complete']
    print("7. Bowler successfully changed to Mitchell Starc")

    # 6. Mitchell Starc bowls a wicket (Bowled - Rohit Sharma out)
    current_striker = live['striker']
    res = client.post(f"/api/matches/{match_id}/wickets", json={
        "delivery_type": "normal",
        "bat_runs": 0,
        "extra_runs": 0,
        "wicket_type": "bowled",
        "player_out_id": current_striker['player_id'],
        "incoming_batsman_id": None
    })
    assert res.status_code == 200
    live = res.json()
    dismissed_id = current_striker['player_id']
    dismissed_name = current_striker['name']
    print(f"8. Wicket recorded: {dismissed_name} is OUT")

    # Check available incoming batsmen - MUST NOT CONTAIN DISMISSED BATSMAN or CREASE BATSMAN
    incoming_ids = [b['player_id'] for b in live['available_incoming']]
    assert dismissed_id not in incoming_ids, f"Dismissed batsman {dismissed_name} found in available incoming!"
    assert live['non_striker']['player_id'] not in incoming_ids, "Non-striker found in available incoming!"
    print("9. Verified: Dismissed batsman and on-crease batsman are completely excluded from available incoming options")

    # 7. Select incoming batsman (Virat Kohli)
    kohli_entry = next((b for b in live['available_incoming'] if b['name'] == 'Virat Kohli'), None)
    assert kohli_entry is not None
    res = client.post(f"/api/matches/{match_id}/batsman", json={
        "batsman_id": kohli_entry['player_id'],
        "is_striker": True
    })
    assert res.status_code == 200
    live = res.json()
    assert live['striker']['name'] == 'Virat Kohli'
    assert live['striker']['player_id'] != live['non_striker']['player_id']
    print(f"10. Incoming batsman selected: Striker is now {live['striker']['name']}, Non-striker is {live['non_striker']['name']}")

    # Check incoming again - neither Kohli, Jaiswal, nor Rohit should be in available incoming
    incoming_names = [b['name'] for b in live['available_incoming']]
    assert 'Rohit Sharma' not in incoming_names
    assert 'Virat Kohli' not in incoming_names
    assert 'Yashasvi Jaiswal' not in incoming_names
    print("11. Verified: Incoming list contains only legitimate not-out remaining batsmen: " + ", ".join(incoming_names[:4]))

    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
