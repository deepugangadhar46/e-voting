import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WebcamCapture from '../components/WebcamCapture';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

const Login = () => {
  const navigate = useNavigate();
  const [voterID, setVoterID] = useState('');
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCamera, setShowCamera] = useState(false);
  const [voterData, setVoterData] = useState(null);

  const handleFaceCapture = (embedding) => {
    setFaceEmbedding(embedding);
    setMessage({ type: 'success', text: 'Face captured! Click Verify to continue.' });
  };

  const handleVerify = async () => {
    if (!faceEmbedding) {
      setMessage({ type: 'error', text: 'Please capture your face first' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = voterID.trim() 
        ? { faceEmbedding, voterID }
        : { faceEmbedding }; // Search all voters if no ID provided

      const response = await axios.post(`${API_URL}/verify`, payload);

      if (response.data.match) {
        setVoterData(response.data.voter);
        setMessage({ 
          type: 'success', 
          text: `Welcome ${response.data.voter.name}! Face verified successfully.` 
        });
        
        // Store voter info in localStorage for the session
        localStorage.setItem('voter', JSON.stringify(response.data.voter));
        
        // Redirect to voting page after 2 seconds
        setTimeout(() => {
          navigate('/vote');
        }, 2000);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Face verification failed. Please try again.' 
      });
      setFaceEmbedding(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h2>Voter Login</h2>
      
      <div className="info-box">
        <strong>Security Notice:</strong> You must blink 2 times to prove you're a real person. 
        Photos or videos will be rejected by liveness detection.
      </div>

      {message.text && (
        <div className={message.type}>{message.text}</div>
      )}

      <div className="card">
        <div className="form-group">
          <label htmlFor="voterID">Voter ID (Optional)</label>
          <input
            type="text"
            id="voterID"
            value={voterID}
            onChange={(e) => setVoterID(e.target.value)}
            placeholder="Enter your voter ID (optional)"
          />
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            Leave empty to search by face only
          </small>
        </div>

        <div className="form-group">
          <label>Face Verification</label>
          {!showCamera && !faceEmbedding && (
            <button 
              type="button" 
              onClick={() => setShowCamera(true)}
              className="btn-primary"
            >
              Start Face Verification
            </button>
          )}
          
          {showCamera && (
            <WebcamCapture 
              onCapture={handleFaceCapture} 
              mode="login"
              loading={loading}
            />
          )}

          {faceEmbedding && (
            <div className="success">
              ✓ Face captured (blink detection passed)
              <button 
                type="button" 
                onClick={() => { setFaceEmbedding(null); setShowCamera(true); }}
                className="btn-secondary"
                style={{ marginLeft: '10px' }}
              >
                Recapture
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={handleVerify}
          className="btn-primary"
          disabled={loading || !faceEmbedding}
        >
          {loading ? 'Verifying...' : 'Verify & Login'}
        </button>

        {voterData && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Verified Voter</h3>
            <p><strong>Name:</strong> {voterData.name}</p>
            <p><strong>Voter ID:</strong> {voterData.voterID}</p>
            <p><strong>Wallet:</strong> {voterData.walletAddress}</p>
            <p style={{ color: '#4CAF50' }}>
              Redirecting to voting page...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
