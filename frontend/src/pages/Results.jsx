import { useState, useEffect } from 'react';
import { getReadOnlyContract } from '../utils/contract';

const Results = () => {
  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResults();
    // Refresh every 10 seconds for live updates
    const interval = setInterval(loadResults, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadResults = async () => {
    try {
      const contract = getReadOnlyContract();
      const candidatesList = await contract.getCandidates();
      
      let total = 0;
      const formatted = candidatesList.map((c) => {
        const votes = Number(c.voteCount);
        total += votes;
        return {
          id: Number(c.id),
          name: c.name,
          voteCount: votes
        };
      });
      
      // Sort by vote count (descending)
      formatted.sort((a, b) => b.voteCount - a.voteCount);
      
      setCandidates(formatted);
      setTotalVotes(total);
      setError('');
      setLoading(false);
    } catch (err) {
      console.error('Error loading results:', err);
      let errMsg = 'Failed to load results from blockchain.';
      if (err.message && err.message.includes('not configured')) {
        errMsg = err.message;
      } else if (err.code === 'BAD_DATA' || err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT' || err.message?.includes('could not detect network') || err.message?.includes('failed to fetch')) {
        errMsg = 'Could not connect to blockchain node. Please verify that your RPC node (http://127.0.0.1:8545 or VITE_RPC_URL) is running and reachable.';
      } else {
        errMsg = `Blockchain read error: ${err.shortMessage || err.message || 'Unknown error'}`;
      }
      setError(errMsg);
      setLoading(false);
    }
  };

  const getPercentage = (votes) => {
    if (totalVotes === 0) return 0;
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="results-page">
        <h2>Election Results</h2>
        <div className="loading">Loading results from blockchain...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page">
        <h2>Election Results</h2>
        <div className="error" style={{ marginBottom: '16px' }}>{error}</div>
        <button onClick={() => { setLoading(true); setError(''); loadResults(); }} className="btn-primary">
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="results-page">
      <h2>Election Results</h2>
      
      <div className="card" style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3>Total Votes Cast</h3>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#4CAF50' }}>
          {totalVotes}
        </div>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Results are fetched directly from the blockchain and cannot be altered
        </p>
      </div>

      <div className="card">
        <h3>Candidate Standings</h3>
        
        {candidates.length === 0 ? (
          <div className="loading">No candidates found</div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {candidates.map((candidate, index) => (
              <div 
                key={candidate.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  marginBottom: '12px',
                  background: index === 0 ? '#e8f5e9' : '#f5f5f5',
                  borderRadius: '8px',
                  border: index === 0 ? '2px solid #4CAF50' : '1px solid #ddd'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: index === 0 ? '#4CAF50' : '#757575',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginRight: '16px'
                }}>
                  {index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '18px' }}>
                    {candidate.name}
                    {index === 0 && (
                      <span style={{
                        marginLeft: '10px',
                        padding: '2px 8px',
                        background: '#4CAF50',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        LEADING
                      </span>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      height: '8px',
                      background: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${getPercentage(candidate.voteCount)}%`,
                        height: '100%',
                        background: index === 0 ? '#4CAF50' : '#2196F3',
                        transition: 'width 0.5s'
                      }} />
                    </div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {candidate.voteCount}
                  </div>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {getPercentage(candidate.voteCount)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
        <small>
          Auto-refreshes every 10 seconds • Data from blockchain: {import.meta.env.VITE_CONTRACT_ADDRESS || 'Not deployed'}
        </small>
      </div>
    </div>
  );
};

export default Results;
