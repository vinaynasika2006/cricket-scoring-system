import urllib.request
import json

BASE = 'http://127.0.0.1:8000/api'

# 1. Create a match
match_payload = {
    'title': 'Ind vs Aus Test Wicket Flow',
    'format': 'T20',
    'total_overs': 20,
    'max_overs_per_bowler': 4,
    'team1': {
        'name': 'India',
        'short_name': 'IND',
        'players': [
            {'name': 'Rohit Sharma', 'batting_order': 1, 'is_captain': True},
            {'name': 'Yashasvi Jaiswal', 'batting_order': 2},
            {'name': 'Virat Kohli', 'batting_order': 3},
            {'name': 'Suryakumar Yadav', 'batting_order': 4},
            {'name': 'Rishabh Pant', 'batting_order': 5, 'is_wicketkeeper': True},
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
            {'name': 'Mitchell Marsh', 'batting_order': 3, 'is_captain': True},
            {'name': 'Glenn Maxwell', 'batting_order': 4},
            {'name': 'Marcus Stoinis', 'batting_order': 5},
            {'name': 'Tim David', 'batting_order': 6},
            {'name': 'Matthew Wade', 'batting_order': 7, 'is_wicketkeeper': True},
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
    'rules': {
        'free_hit_enabled': True,
        'super_over_enabled': True,
        'lbw_rule_enabled': True
    }
}

req = urllib.request.Request(f'{BASE}/matches', data=json.dumps(match_payload).encode(), headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
match_data = json.loads(res.read())
match_id = match_data['match_id']
print('Match Created:', match_id)

# 2. Get Live State
live_res = urllib.request.urlopen(f'{BASE}/matches/{match_id}/live')
live = json.loads(live_res.read())
print('Initial Striker:', live['striker']['name'], 'Status:', live['striker']['status'])
print('Initial Non-Striker:', live['non_striker']['name'])
print('Available incoming:', [b['name'] for b in live['available_incoming'][:3]])

# 3. Dismiss Rohit Sharma (Bowled) with incoming = Virat Kohli
kohli = next(b for b in live['available_incoming'] if 'Kohli' in b['name'])
wicket_payload = {
    'dismissal_type': 'bowled',
    'player_out_id': live['striker']['player_id'],
    'bowler_id': live['bowler']['player_id'],
    'runs_completed': 0,
    'delivery_type': 'normal',
    'bat_runs': 0,
    'extra_runs': 0,
    'incoming_batsman_id': kohli['player_id']
}

w_req = urllib.request.Request(f'{BASE}/matches/{match_id}/wicket', data=json.dumps(wicket_payload).encode(), headers={'Content-Type': 'application/json'})
w_res = urllib.request.urlopen(w_req)
after_w = json.loads(w_res.read())

print('\n--- AFTER WICKET ---')
print('Total Wickets:', after_w['replayed']['total_wickets'])
print('Current Striker Name:', after_w['striker']['name'])
print('Current Striker Status:', after_w['striker']['status'])
print('Current Non-Striker Name:', after_w['non_striker']['name'])

# Check batsman scorecard
for b in after_w['replayed']['batsman_stats'][:4]:
    print(b['name'], ':', b['runs'], 'runs, balls:', b['balls_faced'], '- status:', b['status'], '- dismissal:', b['dismissal'])

assert after_w['striker']['name'] == 'Virat Kohli', f"Expected striker Virat Kohli, got {after_w['striker']['name']}"
assert after_w['striker']['status'] == 'batting', f"Expected status batting, got {after_w['striker']['status']}"
assert after_w['replayed']['batsman_stats'][0]['status'] == 'out', "Expected Rohit Sharma to be out"

# 4. Score a single with Virat Kohli
deliv_payload = {
    'delivery_type': 'normal',
    'bat_runs': 1,
    'extra_runs': 0
}
d_req = urllib.request.Request(f'{BASE}/matches/{match_id}/delivery', data=json.dumps(deliv_payload).encode(), headers={'Content-Type': 'application/json'})
d_res = urllib.request.urlopen(d_req)
after_d = json.loads(d_res.read())

print('\n--- AFTER 1 RUN OFF KOHLI ---')
print('Score:', after_d['replayed']['total_runs'], '/', after_d['replayed']['total_wickets'])
print('Striker now (strike rotated to Jaiswal):', after_d['striker']['name'])
print('Non-Striker (Kohli on 1*):', after_d['non_striker']['name'], after_d['non_striker']['runs'], 'runs')
assert after_d['striker']['name'] == 'Yashasvi Jaiswal'
assert after_d['non_striker']['name'] == 'Virat Kohli'
assert after_d['non_striker']['runs'] == 1

# 5. Dismiss Jaiswal (Caught) with incoming batsman skipped (auto-select next)
wicket2_payload = {
    'dismissal_type': 'caught',
    'player_out_id': after_d['striker']['player_id'],
    'bowler_id': after_d['bowler']['player_id'],
    'fielder_id': after_d['eligible_bowlers'][0]['player_id'],
    'runs_completed': 0,
    'delivery_type': 'normal',
    'bat_runs': 0,
    'extra_runs': 0,
    'incoming_batsman_id': None # Test auto incoming selection
}
w2_req = urllib.request.Request(f'{BASE}/matches/{match_id}/wicket', data=json.dumps(wicket2_payload).encode(), headers={'Content-Type': 'application/json'})
w2_res = urllib.request.urlopen(w2_req)
after_w2 = json.loads(w2_res.read())

print('\n--- AFTER 2ND WICKET (JAISWAL CAUGHT, AUTO INCOMING) ---')
print('Total Wickets:', after_w2['replayed']['total_wickets'])
print('Striker Name:', after_w2['striker']['name'])
print('Striker Status:', after_w2['striker']['status'])
print('Non-Striker Name:', after_w2['non_striker']['name'])
assert after_w2['striker']['name'] == 'Suryakumar Yadav', f"Expected Surya, got {after_w2['striker']['name']}"
assert after_w2['non_striker']['name'] == 'Virat Kohli'

print('\nALL WICKET AND INCOMING BATSMAN TESTS PASSED PERFECTLY!')
