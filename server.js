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
  password: 'Ankush1234#', 
  database: 'nextstep_sports',
});

const TEAMS = ['RCB', 'MI', 'CSK', 'GT', 'SRH', 'RR', 'PBKS', 'DC', 'KKR', 'LSG'];

// 2. Route for Graph Data (Calculates live points cleanly)
app.get('/api/graph-data', async (req, res) => {
  try {
    const [matches] = await pool.query('SELECT * FROM `ipl_match_data1.sql` ORDER BY id ASC');
    
    // Step A: Track the history of each team independently
    let teamStats = {};
    TEAMS.forEach(team => {
      // Everyone starts at match 0 with 0 points
      teamStats[team] = { points: 0, history: [0], ids: [null] }; 
    });

    matches.forEach(match => {
      let teamA = match.t1_short_name;
      let teamB = match.t2_short_name;
      
      let matchWinner = null;
      if (match.winner == match.team1_id || match.winner === teamA || match.winner === match.team1) matchWinner = teamA;
      if (match.winner == match.team2_id || match.winner === teamB || match.winner === match.team2) matchWinner = teamB;

      // Update Team A
      if (teamStats[teamA]) {
        if (matchWinner === teamA) teamStats[teamA].points += 2;
        teamStats[teamA].history.push(teamStats[teamA].points);
        teamStats[teamA].ids.push(match.id);
      }
      
      // Update Team B
      if (teamStats[teamB]) {
        if (matchWinner === teamB) teamStats[teamB].points += 2;
        teamStats[teamB].history.push(teamStats[teamB].points);
        teamStats[teamB].ids.push(match.id);
      }
    });

    // Step B: Find the maximum matches any team has played (Usually 14)
    let maxMatches = 0;
    TEAMS.forEach(team => {
      if (teamStats[team].history.length - 1 > maxMatches) {
        maxMatches = teamStats[team].history.length - 1;
      }
    });

    // Step C: Transpose into Recharts format!
    let graphData = [];
    for (let i = 0; i <= maxMatches; i++) {
      let row = { matchSeq: i };
      TEAMS.forEach(team => {
        // Only plot a dot if the team has actually played this match number
        if (i < teamStats[team].history.length) {
          row[team] = teamStats[team].history[i];
          if (i > 0) row[`${team}_id`] = teamStats[team].ids[i];
        }
      });
      graphData.push(row);
    }

    res.json(graphData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Route for Match Details
app.get('/api/match/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `ipl_match_data1.sql` WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
    
    const dbMatch = rows[0];
    
    const frontendMatch = {
      team_a: dbMatch.t1_short_name || dbMatch.team1,
      team_b: dbMatch.t2_short_name || dbMatch.team2,
      winner: dbMatch.result || "Draw/No Result", 
      win_margin: "", 
      venue: dbMatch.venue || "Unknown Venue",
      first_innings_score: dbMatch.score ? dbMatch.score.toString() : "N/A",
      top_scorer: "Check Scorecard", 
      player_of_match: dbMatch.mom || "N/A" 
    };
    
    res.json(frontendMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));