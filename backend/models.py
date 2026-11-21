from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PlayerCreate(BaseModel):
    name: str
    is_captain: bool = False
    is_wicketkeeper: bool = False
    batting_order: int = 0

class TeamCreate(BaseModel):
    name: str
    short_name: str
    players: List[PlayerCreate]

class MatchRules(BaseModel):
    free_hit_enabled: bool = True
    super_over_enabled: bool = False
    lbw_rule_enabled: bool = True
    custom_rules: Optional[str] = None

class MatchCreateRequest(BaseModel):
    title: str
    format: str = "T20" # T10, T20, ODI, Test, Custom
    total_overs: int = 20
    max_overs_per_bowler: Optional[int] = None
    team1: TeamCreate
    team2: TeamCreate
    toss_winner: str # 'team1' or 'team2'
    toss_decision: str # 'bat' or 'bowl'
    opening_striker_name: str
    opening_non_striker_name: str
    opening_bowler_name: str
    rules: MatchRules = Field(default_factory=MatchRules)

class DeliveryRequest(BaseModel):
    delivery_type: str = "normal" # 'normal', 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty'
    bat_runs: int = 0
    extra_runs: int = 0
    striker_id: Optional[str] = None
    non_striker_id: Optional[str] = None
    bowler_id: Optional[str] = None
    notes: Optional[str] = None

class WicketRequest(BaseModel):
    dismissal_type: str # 'bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_out', 'retired_hurt', 'obstructing_field', 'hit_ball_twice', 'timed_out'
    player_out_id: str
    bowler_id: Optional[str] = None
    fielder_id: Optional[str] = None
    wicketkeeper_id: Optional[str] = None
    runs_completed: int = 0
    incoming_batsman_id: Optional[str] = None
    delivery_type: str = "normal"
    bat_runs: int = 0
    extra_runs: int = 0
    notes: Optional[str] = None

class BowlerChangeRequest(BaseModel):
    bowler_id: str

class IncomingBatsmanRequest(BaseModel):
    batsman_id: str
    is_striker: bool = True

class PenaltyRequest(BaseModel):
    runs: int
    receiving_team_id: str # 'batting' or 'bowling'
    reason: str

class StartSecondInningsRequest(BaseModel):
    opening_striker_id: str
    opening_non_striker_id: str
    opening_bowler_id: str

class ManualCorrectionRequest(BaseModel):
    target_type: str # 'score', 'player_stat', 'bowler_stat', 'extras', 'match_meta'
    target_id: Optional[str] = None # player_id or innings_id
    field_name: str
    new_value: Any
    reason: str

class DeliveryEditRequest(BaseModel):
    delivery_type: str
    bat_runs: int
    extra_runs: int
    notes: Optional[str] = None
