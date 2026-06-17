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
  password: 'Ankush1234#', // <--- PUT YOUR PASSWORD HERE
  database: 'nextstep_sports',
});

const TEAMS = ['RCB', 'MI', 'CSK', 'GT', 'SRH', 'RR', 'PBKS', 'DC', 'KKR', 'LSG'];

// 2. Route for Graph Data (Calculates live points from MySQL)
app.get('/api/graph-data', async (req, res) => {
  try {
    const [matches] = await pool.query('SELECT * FROM matches ORDER BY id ASC');
    
    let teamStats = {};
    TEAMS.forEach(team => {
      teamStats[team] = { points: 0, matchesPlayed: 0 };
    });

    let graphData = Array.from({ length: 15 }, (_, i) => ({ matchSeq: i }));
    TEAMS.forEach(t => graphData[0][t] = 0);

    matches.forEach(match => {
      if (teamStats[match.team_a]) {
        teamStats[match.team_a].matchesPlayed += 1;
        let seq = teamStats[match.team_a].matchesPlayed;
        if (match.winner === match.team_a) teamStats[match.team_a].points += 2;
        
        graphData[seq][match.team_a] = teamStats[match.team_a].points;
        graphData[seq][`${match.team_a}_id`] = match.id;
      }
      if (teamStats[match.team_b]) {
        teamStats[match.team_b].matchesPlayed += 1;
        let seq = teamStats[match.team_b].matchesPlayed;
        if (match.winner === match.team_b) teamStats[match.team_b].points += 2;
        
        graphData[seq][match.team_b] = teamStats[match.team_b].points;
        graphData[seq][`${match.team_b}_id`] = match.id;
      }
    });

    res.json(graphData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Route for Match Details (Fetches single match from MySQL)
app.get('/api/match/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Match not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Real MySQL Server connected! Running on http://localhost:${PORT}`);
});