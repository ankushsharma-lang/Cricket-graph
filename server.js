const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Real MySQL Database Connection Pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Ankush1234#', // ⚠️ Remember to hide this later if making your repo public!
  database: 'nextstep_sports',
});

const TEAMS = ['RCB', 'MI', 'CSK', 'GT', 'SRH', 'RR', 'PBKS', 'DC', 'KKR', 'LSG'];

// 2. Route for Graph Data (Calculates live points from the NEW massive CSV table)
app.get('/api/graph-data', async (req, res) => {
  try {
    // Notice the backticks around the table name because it has a period in it!
    const [matches] = await pool.query('SELECT * FROM `ipl_match_data1.sql` ORDER BY id ASC');
    
    let teamStats = {};
    TEAMS.forEach(team => {
      teamStats[team] = { points: 0, matchesPlayed: 0 };
    });

    // Expanded graph length to 80 to fit a full 74-match IPL season
    let graphData = Array.from({ length: 21 }, (_, i) => ({ matchSeq: i }));
    TEAMS.forEach(t => graphData[0][t] = 0);

    matches.forEach(match => {
      // Pulling the new column names from your imported CSV
      let teamA = match.t1_short_name;
      let teamB = match.t2_short_name;
      
      // Safely figure out who won
      let matchWinner = null;
      if (match.winner == match.team1_id || match.winner === teamA || match.winner === match.team1) matchWinner = teamA;
      if (match.winner == match.team2_id || match.winner === teamB || match.winner === match.team2) matchWinner = teamB;

      if (teamStats[teamA]) {
        teamStats[teamA].matchesPlayed += 1;
        let seq = teamStats[teamA].matchesPlayed;
        if (matchWinner === teamA) teamStats[teamA].points += 2;
        
        if(graphData[seq]) {
            graphData[seq][teamA] = teamStats[teamA].points;
            graphData[seq][`${teamA}_id`] = match.id;
        }
      }
      
      if (teamStats[teamB]) {
        teamStats[teamB].matchesPlayed += 1;
        let seq = teamStats[teamB].matchesPlayed;
        if (matchWinner === teamB) teamStats[teamB].points += 2;
        
        if(graphData[seq]) {
            graphData[seq][teamB] = teamStats[teamB].points;
            graphData[seq][`${teamB}_id`] = match.id;
        }
      }
    });

    res.json(graphData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Route for Match Details (Translates new massive DB into the clean React format)
app.get('/api/match/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `ipl_match_data1.sql` WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
    
    const dbMatch = rows[0];
    
    // The Translator: Takes the complex CSV columns and maps them to what React expects
    const frontendMatch = {
      team_a: dbMatch.t1_short_name || dbMatch.team1,
      team_b: dbMatch.t2_short_name || dbMatch.team2,
      winner: dbMatch.result || "Draw/No Result", 
      win_margin: "", // The CSV bundles this inside 'result'
      venue: dbMatch.venue || "Unknown Venue",
      first_innings_score: dbMatch.score ? dbMatch.score.toString() : "N/A",
      top_scorer: "Check Scorecard", // The CSV doesn't track top scorer by name
      player_of_match: dbMatch.mom || "N/A" 
    };
    
    res.json(frontendMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Real MySQL Server connected! Running on http://localhost:${PORT}`);
});