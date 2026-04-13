import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContract, getAccount } from '../utils/contract';

const Vote = () => {
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasVoted, setHasVoted] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');

  useEffect(() => {
    // Check if voter is logged in
    const storedVoter = localStorage.getItem('voter');
    if (!storedVoter) {
      setMessage({ type: 'error', text: 'Please login first' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    setVoter(JSON.parse(storedVoter));

    // Load candidates
    loadCandidates();
  }, [navigate]);

  const loadCandidates = async () => {
    try {
      const contract = await getContract();
      
      // Check if contract address is valid
      if (!contract || contract.target === '0x0000000000000000000000000000000000000000') {
        setMessage({ type: 'error', text: 'Smart contract not deployed. Please deploy the contract first and update the contract address in .env.local file.' });
        setLoading(false);
        return;
      }
      
      const candidatesList = await contract.getCandidates();
      
      const formatted = candidatesList.map((c, index) => ({
        id: Number(c.id),
        name: c.name,
        voteCount: Number(c.voteCount)
      }));
      
      setCandidates(formatted);

      // Check if current user has voted
      const account = await getAccount();
      if (account) {
        const voted = await contract.voters(account);
        setHasVoted(voted);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      setMessage({ type: 'error', text: 'Failed to load candidates' });
    }
  };

  const castVote = async (candidateId) => {
    if (hasVoted) {
      setMessage({ type: 'error', text: 'You have already voted!' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const contract = await getContract(true); // true = needs signer
      const tx = await contract.castVote(candidateId);
      
      setMessage({ type: 'success', text: 'Transaction submitted. Waiting for confirmation...' });
      
      await tx.wait();
      
      setTransactionHash(tx.hash);
      setHasVoted(true);
      setMessage({ type: 'success', text: 'Vote cast successfully!' });
      
      // Refresh candidates to show updated counts
      loadCandidates();
    } catch (error) {
      console.error('Voting error:', error);
      let errorMsg = 'Failed to cast vote';
      
      if (error.message.includes('already voted')) {
        errorMsg = 'You have already voted!';
      } else if (error.message.includes('MetaMask')) {
        errorMsg = 'MetaMask connection required';
      }
      
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  if (!voter) {
    return (
      <div className="vote-page">
        <div className="loading">Please login to vote...</div>
      </div>
    );
  }

  return (
    <div className="vote-page">
      <h2>Cast Your Vote</h2>
      
      <div className="card">
        <h3>Voter Information</h3>
        <p><strong>Name:</strong> {voter.name}</p>
        <p><strong>Voter ID:</strong> {voter.voterID}</p>
        <p><strong>Wallet:</strong> {voter.walletAddress}</p>
        
        {hasVoted && (
          <div className="success">
            ✓ You have already voted. Thank you for participating!
          </div>
        )}
      </div>

      {message.text && (
        <div className={message.type}>{message.text}</div>
      )}

      {transactionHash && (
        <div className="card" style={{ background: '#e8f5e9' }}>
          <h3>Transaction Receipt</h3>
          <p>Your vote is recorded on the blockchain!</p>
          <p><strong>Transaction Hash:</strong></p>
          <div className="transaction-hash">{transactionHash}</div>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>
            You can verify this on{' '}
            <a 
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#2196F3' }}
            >
              Sepolia Etherscan
            </a>
          </p>
        </div>
      )}

      <h3>Candidates</h3>
      
      {candidates.length === 0 ? (
        <div className="loading">Loading candidates...</div>
      ) : (
        <div className="candidate-list">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="candidate-card">
              <h4>{candidate.name}</h4>
              <p>Candidate #{candidate.id}</p>
              <div className="vote-count">{candidate.voteCount} votes</div>
              
              {!hasVoted && (
                <button
                  onClick={() => castVote(candidate.id)}
                  disabled={loading}
                  className="btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                >
                  {loading ? 'Processing...' : 'Vote'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vote;
