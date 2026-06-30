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
  
  if (payload === undefined || payload[dataKey] === undefined) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={color}
      stroke="#fff"
      strokeWidth={2}
      cursor="pointer"
      onClick={() => onDotClick(payload, dataKey)}
      style={{ pointerEvents: 'auto', transition: 'all 0.2s' }}
    />
  );
};

export default function App() {
  const [graphData, setGraphData] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSeq, setSelectedSeq] = useState(null);

  const [visibleTeams, setVisibleTeams] = useState(
    Object.keys(TEAM_CONFIG).reduce((acc, team) => ({ ...acc, [team]: true }), {})
  );

  useEffect(() => {
    axios.get('http://localhost:5001/api/graph-data')
      .then((res) => {
        setGraphData(res.data);
        if (res.data.length > 0) {
            setSelectedSeq(res.data.length - 1); // Default to the final match state
        }
      })
      .catch((err) => console.error("Database Error:", err));
  }, []);

  const handleDotClick = async (payload, dataKey) => {
    const matchId = payload[`${dataKey}_id`];
    const seq = payload.matchSeq;
    
    if (seq !== undefined) setSelectedSeq(seq);
    if (!matchId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/match/${matchId}`);
      setSelectedMatch(response.data);
    } catch (err) {
      console.error("Error fetching match:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (team) => setVisibleTeams(prev => ({ ...prev, [team]: !prev[team] }));

  // Points Table Calculation
  const currentDataRow = graphData.length > 0 && selectedSeq !== null ? graphData[selectedSeq] : null;
  const standings = currentDataRow
    ? Object.keys(TEAM_CONFIG).map(team => ({
        team,
        points: currentDataRow[team] !== undefined ? currentDataRow[team] : 0,
        color: TEAM_CONFIG[team].color
      })).sort((a, b) => b.points - a.points)
    : [];

  return (
    <div style={{ padding: '32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '1400px', margin: '0 auto', color: '#111827', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Tournament Telemetry</h1>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '16px' }}>Interactive standings and match history.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SPREADSHEET STYLE GRAPH */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px 24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ height: '450px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  {/* Clean, subtle horizontal grid lines only, like Apple Numbers */}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="matchSeq" tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }} />
                  
                  {Object.keys(TEAM_CONFIG).map((team) => (
                    visibleTeams[team] && (
                      <Line 
                        key={team}
                        type="linear" // Changed to linear for sharp, precise Apple Numbers look
                        dataKey={team} 
                        stroke={TEAM_CONFIG[team].color} 
                        strokeWidth={3} 
                        connectNulls={true}
                        activeDot={(dotProps) => (
                          <CustomDot {...dotProps} dataKey={team} color={TEAM_CONFIG[team].color} onDotClick={handleDotClick} />
                        )}
                        dot={(dotProps) => (
                          <CustomDot {...dotProps} dataKey={team} color={TEAM_CONFIG[team].color} onDotClick={handleDotClick} />
                        )}
                      />
                    )
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
              <button 
                onClick={() => setVisibleTeams(Object.keys(TEAM_CONFIG).reduce((acc, t) => ({ ...acc, [t]: true }), {}))}
                style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#111827', fontWeight: 'bold', fontSize: '14px' }}>
                Show All
              </button>
              {Object.keys(TEAM_CONFIG).map((team) => (
                <button 
                  key={team}
                  onClick={() => toggleTeam(team)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', cursor: 'pointer',
                    background: visibleTeams[team] ? '#f9fafb' : '#fff', opacity: visibleTeams[team] ? 1 : 0.4, transition: 'all 0.2s', fontWeight: '600', fontSize: '13px'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: TEAM_CONFIG[team].color }}></div>
                  {TEAM_CONFIG[team].label}
                </button>
              ))}
            </div>
          </div>

          {/* POINTS TABLE */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#111827', fontWeight: '700' }}>
              Standings <span style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 'normal', marginLeft: '8px' }}>
                {selectedSeq !== null && selectedSeq !== 0 ? `(After Match ${selectedSeq})` : '(Current)'}
              </span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#9ca3af', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Pos</th>
                    <th style={{ padding: '12px 16px' }}>Team</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.team} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px', fontWeight: '700', color: '#6b7280', fontSize: '15px' }}>{index + 1}</td>
                      <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '700', fontSize: '15px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: row.color }}></div>
                        {row.team}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800', fontSize: '18px', color: '#111827' }}>
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Match Scorecard */}
        <div style={{ background: '#111827', color: '#fff', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', borderBottom: '1px solid #374151', paddingBottom: '16px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>
            Match Scorecard
          </h3>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#6b7280' }}>
              <p>Fetching database...</p>
            </div>
          ) : selectedMatch ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center', background: '#1f2937', padding: '24px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#f9fafb', letterSpacing: '-0.5px' }}>
                  {selectedMatch.team_a} <span style={{color: '#4b5563', fontSize: '16px', margin: '0 8px', fontWeight: '500'}}>vs</span> {selectedMatch.team_b}
                </div>
                <div style={{ marginTop: '16px', color: '#10b981', fontWeight: '700', fontSize: '15px' }}>
                  {selectedMatch.winner}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>Venue</span>
                  <span style={{ fontWeight: '600', textAlign: 'right', maxWidth: '65%' }}>{selectedMatch.venue}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>1st Innings</span>
                  <span style={{ fontWeight: '700', color: '#f9fafb' }}>{selectedMatch.first_innings_score}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Player of Match</span>
                  <span style={{ fontWeight: '700', color: '#fbbf24', textAlign: 'right', maxWidth: '65%' }}>{selectedMatch.player_of_match}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '15px', lineHeight: '1.6' }}>
                Select any point on the graph to view match statistics.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}