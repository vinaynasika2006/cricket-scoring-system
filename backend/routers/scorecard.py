import io
import json
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from typing import Dict, Any

from database import get_db
from engine import CricketEngine, balls_to_overs_str
from routers.scoring import fetch_innings_data

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/api/matches/{match_id}", tags=["scorecard"])

def compile_innings_scorecard(conn, innings_id: str, match_settings: Dict[str, Any]):
    innings_row, batting_players, bowling_players, deliveries, wickets = fetch_innings_data(conn, innings_id)
    if not innings_row:
        return None

    replayed = CricketEngine.replay_innings(
        innings_info=innings_row,
        batting_players=batting_players,
        bowling_players=bowling_players,
        deliveries=deliveries,
        wickets=wickets,
        match_settings=match_settings,
        target=innings_row.get("target")
    )

    cursor = conn.cursor()
    cursor.execute("SELECT name, short_name FROM teams WHERE id = ?", (innings_row["batting_team_id"],))
    batting_team = dict(cursor.fetchone())
    cursor.execute("SELECT name, short_name FROM teams WHERE id = ?", (innings_row["bowling_team_id"],))
    bowling_team = dict(cursor.fetchone())

    # Did not bat list
    did_not_bat = [
        b["name"] for b in replayed["batsman_stats"]
        if b["status"] == "not_out" and b["balls_faced"] == 0 and b["player_id"] not in (replayed["current_striker_id"], replayed["current_non_striker_id"])
    ]

    return {
        "innings_id": innings_id,
        "innings_number": innings_row["innings_number"],
        "batting_team": batting_team,
        "bowling_team": bowling_team,
        "total_runs": replayed["total_runs"],
        "total_wickets": replayed["total_wickets"],
        "overs": replayed["overs_str"],
        "run_rate": replayed["current_run_rate"],
        "target": replayed["target"],
        "batting_card": replayed["batsman_stats"],
        "bowling_card": replayed["bowler_stats"],
        "extras": replayed["extras"],
        "fall_of_wickets": replayed["fall_of_wickets"],
        "did_not_bat": did_not_bat,
        "overs_breakdown": replayed["overs_breakdown"],
        "deliveries": deliveries
    }

@router.get("/scorecard")
def get_full_scorecard(match_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        match_row = cursor.fetchone()
        if not match_row:
            raise HTTPException(status_code=404, detail="Match not found")

        match = dict(match_row)
        rules = json.loads(match.get("rules_json") or "{}")
        match_settings = {
            "total_overs": match["total_overs"],
            "max_overs_per_bowler": match["max_overs_per_bowler"],
            "free_hit_enabled": rules.get("free_hit_enabled", True),
            "super_over_enabled": rules.get("super_over_enabled", False),
        }

        cursor.execute("SELECT * FROM teams WHERE match_id = ?", (match_id,))
        teams = {r["id"]: dict(r) for r in cursor.fetchall()}

        cursor.execute("SELECT * FROM players WHERE match_id = ?", (match_id,))
        players = {r["id"]: dict(r) for r in cursor.fetchall()}

        cursor.execute("SELECT id FROM innings WHERE match_id = ? ORDER BY innings_number ASC", (match_id,))
        innings_rows = cursor.fetchall()

        innings_scorecards = []
        for inn in innings_rows:
            sc = compile_innings_scorecard(conn, inn["id"], match_settings)
            if sc:
                innings_scorecards.append(sc)

        potm_name = players.get(match.get("player_of_the_match_id"), {}).get("name")

        return {
            "match": match,
            "teams": list(teams.values()),
            "innings": innings_scorecards,
            "player_of_the_match": potm_name
        }

@router.put("/player-of-match")
def set_player_of_match(match_id: str, data: Dict[str, Any]):
    player_id = data.get("player_id")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE matches SET player_of_the_match_id = ? WHERE id = ?", (player_id, match_id))
    return {"message": "Player of the match updated"}

@router.get("/export-pdf")
def export_scorecard_pdf(match_id: str):
    with get_db() as conn:
        scorecard_data = get_full_scorecard(match_id)

    match = scorecard_data["match"]
    innings_list = scorecard_data["innings"]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#065f46'),
        alignment=1 # Center
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1f2937'),
        alignment=1
    )
    result_style = ParagraphStyle(
        'ResultStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#047857'),
        alignment=1
    )
    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#064e3b')
    )
    cell_style = ParagraphStyle('CellStyle', fontName='Helvetica', fontSize=8, leading=10)
    cell_bold = ParagraphStyle('CellBold', fontName='Helvetica-Bold', fontSize=8, leading=10)

    elements = []

    # Title & Subtitle
    elements.append(Paragraph(f"CRICKET MATCH SCORECARD - {match['title'].upper()}", title_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"Format: {match['format']} | Total Overs: {match['total_overs']} Overs", subtitle_style))
    elements.append(Spacer(1, 4))
    if match.get("result_summary"):
        elements.append(Paragraph(f"Result: {match['result_summary'].upper()}", result_style))
    elements.append(Spacer(1, 14))

    for inn in innings_list:
        t_name = inn["batting_team"]["name"].upper()
        tot = f"{inn['total_runs']}/{inn['total_wickets']} ({inn['overs']} Ov, RR: {inn['run_rate']})"
        elements.append(Paragraph(f"INNINGS {inn['innings_number']}: {t_name} - {tot}", h2_style))
        elements.append(Spacer(1, 6))

        # Batting Table
        bat_data = [[
            Paragraph("Batter", cell_bold),
            Paragraph("Dismissal", cell_bold),
            Paragraph("R", cell_bold),
            Paragraph("B", cell_bold),
            Paragraph("4s", cell_bold),
            Paragraph("6s", cell_bold),
            Paragraph("SR", cell_bold)
        ]]
        for b in inn["batting_card"]:
            if b["status"] != "not_out" or b["balls_faced"] > 0:
                bat_data.append([
                    Paragraph(b["name"], cell_style),
                    Paragraph(b["dismissal"], cell_style),
                    Paragraph(str(b["runs"]), cell_style),
                    Paragraph(str(b["balls_faced"]), cell_style),
                    Paragraph(str(b["fours"]), cell_style),
                    Paragraph(str(b["sixes"]), cell_style),
                    Paragraph(f"{b['strike_rate']:.1f}", cell_style)
                ])

        ext = inn["extras"]
        ext_text = f"b {ext['byes']}, lb {ext['leg_byes']}, w {ext['wides']}, nb {ext['no_balls']}, pen {ext['penalty']}"
        bat_data.append([
            Paragraph(f"Extras: {ext['total']}", cell_bold),
            Paragraph(f"({ext_text})", cell_style),
            Paragraph(str(ext["total"]), cell_bold),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style)
        ])
        bat_data.append([
            Paragraph("Total", cell_bold),
            Paragraph(f"({inn['total_wickets']} wkts, {inn['overs']} ov)", cell_bold),
            Paragraph(str(inn["total_runs"]), cell_bold),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph(f"RR: {inn['run_rate']}", cell_bold)
        ])

        bat_table = Table(bat_data, colWidths=[120, 190, 40, 40, 40, 40, 50])
        bat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ecfdf5')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ]))
        elements.append(bat_table)
        elements.append(Spacer(1, 10))

        # Bowling Table
        elements.append(Paragraph(f"Bowling - {inn['bowling_team']['name']}", h2_style))
        elements.append(Spacer(1, 4))
        bowl_data = [[
            Paragraph("Bowler", cell_bold),
            Paragraph("O", cell_bold),
            Paragraph("M", cell_bold),
            Paragraph("R", cell_bold),
            Paragraph("W", cell_bold),
            Paragraph("ECON", cell_bold),
            Paragraph("WD", cell_bold),
            Paragraph("NB", cell_bold)
        ]]
        for bw in inn["bowling_card"]:
            if bw["legal_balls"] > 0 or bw["wides"] > 0 or bw["no_balls"] > 0:
                bowl_data.append([
                    Paragraph(bw["name"], cell_style),
                    Paragraph(bw["overs_str"], cell_style),
                    Paragraph(str(bw["maidens"]), cell_style),
                    Paragraph(str(bw["runs_conceded"]), cell_style),
                    Paragraph(str(bw["wickets"]), cell_style),
                    Paragraph(f"{bw['economy']:.2f}", cell_style),
                    Paragraph(str(bw["wides"]), cell_style),
                    Paragraph(str(bw["no_balls"]), cell_style)
                ])

        bowl_table = Table(bowl_data, colWidths=[160, 50, 50, 50, 50, 60, 50, 50])
        bowl_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ecfdf5')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ]))
        elements.append(bowl_table)

        # Fall of wickets
        if inn["fall_of_wickets"]:
            elements.append(Spacer(1, 6))
            fow_str = ", ".join([f"{f['score']}-{f['wicket_number']} ({f['player_name']}, {f['overs']} ov)" for f in inn["fall_of_wickets"]])
            elements.append(Paragraph(f"<b>Fall of Wickets:</b> {fow_str}", cell_style))

        elements.append(Spacer(1, 16))

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=scorecard_{match_id}.pdf"}
    )
