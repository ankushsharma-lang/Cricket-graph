import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function App() {
  const [graphData, setGraphData] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [visibleTeams, setVisibleTeams] = useState(
    Object.keys(TEAM_CONFIG).reduce((acc, team) => ({ ...acc, [team]: true }), {})
  );

  useEffect(() => {
    axios.get('http://localhost:5001/api/graph-data')
      .then((res) => setGraphData(res.data))
      .catch((err) => console.error("Database Error:", err));
  }, []);

  const handleDotClick = async (event, dataKey) => {
    const matchId = event.payload[`${dataKey}_id`];
    if (!matchId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/match/${matchId}`);
      setSelectedMatch(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (team) => {
    setVisibleTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#333' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Live Points Tracker</h1>
        <p style={{ color: '#666', margin: 0 }}>Click on any interactive dot marker to pull historical match telemetry straight from MySQL.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '24px' }}>
        
        {/* Left Side: Graph & Buttons */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
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
                      dot={{ r: 4, cursor: 'pointer', fill: TEAM_CONFIG[team].color }}
                      activeDot={{ r: 7, onClick: (e) => handleDotClick(e, team) }} 
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
            <button 
              onClick={() => setVisibleTeams(Object.keys(TEAM_CONFIG).reduce((acc, t) => ({ ...acc, [t]: true }), {}))}
              style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}>
              Reset
            </button>
            
            {Object.keys(TEAM_CONFIG).map((team) => (
              <button 
                key={team}
                onClick={() => toggleTeam(team)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 16px', borderRadius: '20px', border: '1px solid #d1d5db', cursor: 'pointer',
                  background: visibleTeams[team] ? '#f9fafb' : '#fff',
                  opacity: visibleTeams[team] ? 1 : 0.4,
                  transition: 'opacity 0.2s'
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: TEAM_CONFIG[team].color }}></div>
                {TEAM_CONFIG[team].label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Detailed Match Inspector */}
        <div style={{ background: '#111827', color: '#fff', borderRadius: '12px', padding: '24px', height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', borderBottom: '1px solid #374151', paddingBottom: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Match Scorecard
          </h3>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280' }}>
              <p>Fetching database...</p>
            </div>
          ) : selectedMatch ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header: Teams & Result */}
              <div style={{ textAlign: 'center', background: '#1f2937', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff' }}>
                  {selectedMatch.team_a} <span style={{color: '#6b7280', fontSize: '16px', margin: '0 8px'}}>vs</span> {selectedMatch.team_b}
                </div>
                <div style={{ marginTop: '8px', color: '#34d399', fontWeight: 'bold', fontSize: '15px' }}>
                  {selectedMatch.winner} won by {selectedMatch.win_margin}
                </div>
              </div>

              {/* Match Details Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Venue</span>
                  <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedMatch.venue}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>1st Innings</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedMatch.first_innings_score}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Top Scorer</span>
                  <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{selectedMatch.top_scorer}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Player of Match</span>
                  <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{selectedMatch.player_of_match}</span>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' }}>
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