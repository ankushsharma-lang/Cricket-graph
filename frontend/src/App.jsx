import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Team Colors Configuration
const TEAM_CONFIG = {
  RCB: { color: '#ef4444', label: 'RCB' },
  MI:  { color: '#004ba0', label: 'MI' },
  CSK: { color: '#eab308', label: 'CSK' },
  GT:  { color: '#111827', label: 'GT' },
  SRH: { color: '#f97316', label: 'SRH' },
  RR:  { color: '#ec4899', label: 'RR' },
  PBKS:{ color: '#dc2626', label: 'PBKS' },
  DC:  { color: '#2563eb', label: 'DC' },
  KKR: { color: '#6b21a8', label: 'KKR' },
  LSG: { color: '#0ea5e9', label: 'LSG' }
};

// Custom Dot Component for Click Handling
const CustomDot = (props) => {
  const { cx, cy, fill, payload, dataKey, onDotClick, color } = props;
  
  // Only render if this team has data at this point
  if (payload === undefined || payload[dataKey] === undefined) {
    return null;
  }

  const handleClick = () => {
    console.log("Dot clicked! Payload:", payload, "DataKey:", dataKey);
    onDotClick(payload, dataKey);
  };

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={fill || color}
      cursor="pointer"
      onClick={handleClick}
      style={{ pointerEvents: 'auto' }}
    />
  );
};

export default function App() {
  const [graphData, setGraphData] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // NEW: Tracks which point in time the user clicked on
  const [selectedSeq, setSelectedSeq] = useState(null);

  const [visibleTeams, setVisibleTeams] = useState(
    Object.keys(TEAM_CONFIG).reduce((acc, team) => ({ ...acc, [team]: true }), {})
  );

  useEffect(() => {
    axios.get('http://localhost:5001/api/graph-data')
      .then((res) => {
        setGraphData(res.data);
        // Find the last match with actual team data (not empty ones)
        let lastMatchWithData = 0;
        for (let i = res.data.length - 1; i >= 0; i--) {
          if (res.data[i].RCB !== undefined || res.data[i].MI !== undefined) {
            lastMatchWithData = i;
            break;
          }
        }
        setSelectedSeq(lastMatchWithData);
      })
      .catch((err) => console.error("Database Error:", err));
  }, []);

  const handleDotClick = async (payload, dataKey) => {
    console.log("handleDotClick called with payload:", payload, "dataKey:", dataKey);
    const matchId = payload[`${dataKey}_id`];
    const seq = payload.matchSeq;
    
    console.log("Match ID:", matchId, "Sequence:", seq);

    // Update the Points Table to this exact moment in time
    if (seq !== undefined) {
      console.log("Setting selectedSeq to:", seq);
      setSelectedSeq(seq);
    }
    
    if (!matchId) {
      console.log("No match ID found");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/match/${matchId}`);
      console.log("Match data fetched:", response.data);
      setSelectedMatch(response.data);
    } catch (err) {
      console.error("Error fetching match:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (team) => {
    setVisibleTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  // --- CALCULATE POINTS TABLE DATA ---
  // Grab the row of data for the currently selected match sequence
  const currentDataRow = graphData.length > 0 && selectedSeq !== null 
    ? graphData[selectedSeq] 
    : null;

  // Extract the teams, get their points, and sort them highest to lowest
  const standings = currentDataRow
    ? Object.keys(TEAM_CONFIG).map(team => ({
        team,
        points: currentDataRow[team] !== undefined ? currentDataRow[team] : 0,
        color: TEAM_CONFIG[team].color
      })).sort((a, b) => b.points - a.points)
    : [];

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto', color: '#333' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Live IPL Points Tracker</h1>
        <p style={{ color: '#666', margin: 0 }}>Click on any dot marker to view the Match Scorecard and rewind the Points Table.</p>
      </header>

      {/* Main Grid: Left side for Graph & Table, Right side for Scorecard */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Graph & Points Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* THE GRAPH */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ height: '400px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="matchSeq" tickLine={false} tick={{fill: '#6b7280'}} label={{ value: 'Matches Played', position: 'insideBottom', offset: -10, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} label={{ value: 'Pts', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  
                  {Object.keys(TEAM_CONFIG).map((team) => (
                    visibleTeams[team] && (
                      <Line 
                        key={team}
                        type="monotone" 
                        dataKey={team} 
                        stroke={TEAM_CONFIG[team].color} 
                        strokeWidth={3} 
                        connectNulls={true}
                        dot={<CustomDot dataKey={team} color={TEAM_CONFIG[team].color} onDotClick={handleDotClick} />}
                        activeDot={{ r: 8 }} 
                      />
                    )
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                onClick={() => setVisibleTeams(Object.keys(TEAM_CONFIG).reduce((acc, t) => ({ ...acc, [t]: false }), {}))}
                style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}>
                Reset
              </button>
              {Object.keys(TEAM_CONFIG).map((team) => (
                <button 
                  key={team}
                  onClick={() => toggleTeam(team)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '20px', border: '1px solid #d1d5db', cursor: 'pointer',
                    background: visibleTeams[team] ? '#f9fafb' : '#fff', opacity: visibleTeams[team] ? 1 : 0.4, transition: 'opacity 0.2s'
                  }}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: TEAM_CONFIG[team].color }}></div>
                  {TEAM_CONFIG[team].label}
                </button>
              ))}
            </div>
          </div>

          {/* THE NEW POINTS TABLE */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#111827' }}>
              Standings <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 'normal' }}>
                {selectedSeq !== null ? `(After Match ${selectedSeq})` : '(Current)'}
              </span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '14px' }}>
                    <th style={{ padding: '12px 8px' }}>Pos</th>
                    <th style={{ padding: '12px 8px' }}>Team</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.team} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#4b5563' }}>#{index + 1}</td>
                      <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: row.color }}></div>
                        {row.team}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Match Scorecard (Sticky) */}
        <div style={{ background: '#111827', color: '#fff', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', borderBottom: '1px solid #374151', paddingBottom: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Match Scorecard
          </h3>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#6b7280' }}>
              <p>Fetching from MySQL...</p>
            </div>
          ) : selectedMatch ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', background: '#1f2937', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff' }}>
                  {selectedMatch.team_a} <span style={{color: '#6b7280', fontSize: '16px', margin: '0 8px'}}>vs</span> {selectedMatch.team_b}
                </div>
                <div style={{ marginTop: '12px', color: '#34d399', fontWeight: 'bold', fontSize: '14px', lineHeight: '1.4' }}>
                  {selectedMatch.winner}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Venue</span>
                  <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '60%' }}>{selectedMatch.venue}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>1st Innings</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedMatch.first_innings_score}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Player of Match</span>
                  <span style={{ fontWeight: 'bold', color: '#fbbf24', textAlign: 'right', maxWidth: '60%' }}>{selectedMatch.player_of_match}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                Select any point on the graph to view detailed match statistics.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}