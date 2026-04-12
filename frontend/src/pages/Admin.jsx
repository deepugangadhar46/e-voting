import { useState, useEffect } from 'react';
import { getContract } from '../utils/contract';

const Admin = () => {
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkAdmin();
    loadCandidates();
  }, []);

  const checkAdmin = async () => {
    try {
      const contract = await getContract();
      const adminAddress = await contract.admin();
      
      // Get connected MetaMask account
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setIsAdmin(accounts[0].toLowerCase() === adminAddress.toLowerCase());
        }
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const contract = await getContract();
      const candidatesList = await contract.getCandidates();
      
      const formatted = candidatesList.map((c) => ({
        id: Number(c.id),
        name: c.name,
        voteCount: Number(c.voteCount)
      }));
      
      setCandidates(formatted);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setMessage({ type: 'error', text: 'MetaMask is not installed' });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await checkAdmin();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect MetaMask' });
    }
  };

  const addCandidate = async (e) => {
    e.preventDefault();
    
    if (!newCandidate.trim()) {
      setMessage({ type: 'error', text: 'Please enter a candidate name' });
      return;
    }

    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Only admin can add candidates' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const contract = await getContract(true);
      const tx = await contract.addCandidate(newCandidate);
      
      setMessage({ type: 'success', text: 'Adding candidate... Waiting for confirmation' });
      
      await tx.wait();
      
      setMessage({ type: 'success', text: 'Candidate added successfully!' });
      setNewCandidate('');
      loadCandidates();
    } catch (error) {
      console.error('Error adding candidate:', error);
      setMessage({ type: 'error', text: 'Failed to add candidate. Make sure you are the admin.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      {!isAdmin && (
        <div className="meta-mask-notice">
          <h3>Admin Access Required</h3>
          <p>You need to connect with the admin wallet to manage candidates.</p>
          <button onClick={connectMetaMask} className="btn-primary">
            Connect MetaMask
          </button>
        </div>
      )}

      {message.text && (
        <div className={message.type}>{message.text}</div>
      )}

      <div className="card">
        <h3>Add New Candidate</h3>
        
        <form onSubmit={addCandidate}>
          <div className="form-group">
            <label htmlFor="candidateName">Candidate Name</label>
            <input
              type="text"
              id="candidateName"
              value={newCandidate}
              onChange={(e) => setNewCandidate(e.target.value)}
              placeholder="Enter candidate name"
              disabled={!isAdmin}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || !isAdmin}
          >
            {loading ? 'Adding...' : 'Add Candidate'}
          </button>
        </form>

        {!isAdmin && (
          <p style={{ color: '#f44336', marginTop: '12px' }}>
            ⚠ You must be connected as admin to add candidates
          </p>
        )}
      </div>

      <div className="card">
        <h3>Current Candidates ({candidates.length})</h3>
        
        {candidates.length === 0 ? (
          <p style={{ color: '#666' }}>No candidates added yet</p>
        ) : (
          <div className="candidate-list" style={{ marginTop: '16px' }}>
            {candidates.map((candidate) => (
              <div key={candidate.id} className="candidate-card">
                <h4>#{candidate.id} {candidate.name}</h4>
                <div className="vote-count">{candidate.voteCount} votes</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: '#fff3e0' }}>
        <h3>Important Notes</h3>
        <ul style={{ paddingLeft: '20px', color: '#666' }}>
          <li>Only the contract admin can add candidates</li>
          <li>Once added, candidates cannot be removed (blockchain immutability)</li>
          <li>Each candidate needs at least one vote to appear in results</li>
          <li>All transactions are recorded on the blockchain permanently</li>
        </ul>
      </div>
    </div>
  );
};

export default Admin;
