import urllib.request
import json

BASE = "http://127.0.0.1:8000/api"

def post(url, data=None):
    payload = json.dumps(data).encode("utf-8") if data is not None else b"{}"
    req = urllib.request.Request(
        f"{BASE}{url}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(url):
    req = urllib.request.Request(f"{BASE}{url}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=== STARTING END-TO-END CRICKET SYSTEM TEST ===")
    
    # 1. Create Match
    setup_payload = {
        "title": "Ind vs Aus T20 Thriller",
        "format": "T20",
        "total_overs": 5,
        "max_overs_per_bowler": 2,
        "team1": {
            "name": "India",
            "short_name": "IND",
            "players": [
                {"name": f"Ind Player {i}", "is_captain": i==1, "is_wicketkeeper": i==5, "batting_order": i} for i in range(1, 12)
            ]
        },
        "team2": {
            "name": "Australia",
            "short_name": "AUS",
            "players": [
                {"name": f"Aus Player {i}", "is_captain": i==8, "is_wicketkeeper": i==7, "batting_order": i} for i in range(1, 12)
            ]
        },
        "toss_winner": "team1",
        "toss_decision": "bat",
        "opening_striker_name": "Ind Player 1",
        "opening_non_striker_name": "Ind Player 2",
        "opening_bowler_name": "Aus Player 8",
        "rules": {
            "free_hit_enabled": True,
            "super_over_enabled": True,
            "lbw_rule_enabled": True
        }
    }
    m = post("/matches", setup_payload)
    match_id = m["match_id"]
    print(f"Match Created: ID {match_id}")

    # 2. Get Live State
    live = get(f"/matches/{match_id}/live")
    assert live["replayed"]["total_runs"] == 0
    assert live["striker"]["name"] == "Ind Player 1"
    print("Initial state: 0/0 (0.0 overs) verified")

    # 3. Score Normal 4
    live = post(f"/matches/{match_id}/delivery", {"delivery_type": "normal", "bat_runs": 4})
    assert live["replayed"]["total_runs"] == 4
    assert live["replayed"]["legal_balls"] == 1
    print("Scored 4 off the bat -> 4/0 (0.1 ov) verified")

    # 4. Score Single (Strike rotation)
    live = post(f"/matches/{match_id}/delivery", {"delivery_type": "normal", "bat_runs": 1})
    assert live["replayed"]["total_runs"] == 5
    assert live["striker"]["name"] == "Ind Player 2"
    print("Scored single -> Strike rotated to Ind Player 2 verified")

    # 5. Bowl No-Ball -> Free Hit Triggered
    live = post(f"/matches/{match_id}/delivery", {"delivery_type": "no_ball", "bat_runs": 2})
    assert live["replayed"]["free_hit_active"] is True
    print("No Ball scored -> Free Hit Active verified")

    # 6. Next delivery on Free Hit: Wide -> Free Hit should continue
    live = post(f"/matches/{match_id}/delivery", {"delivery_type": "wide", "extra_runs": 0})
    assert live["replayed"]["free_hit_active"] is True
    print("Wide bowled on Free Hit -> Free Hit carried over verified")

    # 7. Deliver legal ball on Free Hit -> Free Hit consumed
    live = post(f"/matches/{match_id}/delivery", {"delivery_type": "normal", "bat_runs": 1})
    assert live["replayed"]["free_hit_active"] is False
    print("Legal ball on Free Hit -> Free Hit consumed verified")

    # 8. Score Wicket (Caught)
    w_payload = {
        "dismissal_type": "caught",
        "player_out_id": live["replayed"]["current_striker_id"],
        "fielder_id": live["eligible_bowlers"][1]["player_id"],
        "delivery_type": "normal",
        "bat_runs": 0,
        "incoming_batsman_id": live["available_incoming"][0]["player_id"]
    }
    live = post(f"/matches/{match_id}/wicket", w_payload)
    assert live["replayed"]["total_wickets"] == 1
    print("Wicket (Caught) recorded -> Fall of Wicket verified")

    # 9. Test Undo
    prev_runs = live["replayed"]["total_runs"]
    live = post(f"/matches/{match_id}/undo")
    assert live["replayed"]["total_wickets"] == 0
    print("Undo last delivery verified -> Wicket count reverted to 0")

    # 10. Fetch full scorecard
    sc = get(f"/matches/{match_id}/scorecard")
    assert len(sc["innings"]) >= 1
    print("Full Scorecard API verified")

    # 11. Test PDF Export
    pdf_req = urllib.request.Request(f"{BASE}/matches/{match_id}/export-pdf")
    with urllib.request.urlopen(pdf_req) as pdf_resp:
        pdf_bytes = pdf_resp.read()
        assert len(pdf_bytes) > 500
        assert pdf_bytes.startswith(b"%PDF")
        print(f"Official PDF generated successfully ({len(pdf_bytes)} bytes)")

    print("=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
