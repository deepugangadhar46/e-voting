import { useState } from 'react';
import WebcamCapture from '../components/WebcamCapture';
import axios from 'axios';
import { API_URL } from '../config';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    voterID: '',
    walletAddress: ''
  });
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCamera, setShowCamera] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFaceCapture = (embedding) => {
    setFaceEmbedding(embedding);
    setMessage({ type: 'success', text: 'Face captured successfully!' });
    setShowCamera(false);
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setMessage({ 
        type: 'error', 
        text: 'MetaMask is not installed. Please install MetaMask first.' 
      });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      setFormData({ ...formData, walletAddress: accounts[0] });
      setMessage({ type: 'success', text: 'MetaMask connected!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect MetaMask: ' + error.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.voterID || !formData.walletAddress) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (!faceEmbedding) {
      setMessage({ type: 'error', text: 'Please capture your face' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API_URL}/register`, {
        name: formData.name,
        voterID: formData.voterID,
        walletAddress: formData.walletAddress,
        faceEmbedding: faceEmbedding
      });

      setMessage({ 
        type: 'success', 
        text: 'Registration successful! You can now login to vote.' 
      });
      
      // Reset form
      setFormData({ name: '', voterID: '', walletAddress: '' });
      setFaceEmbedding(null);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Registration failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <h2>Voter Registration</h2>
      
      <div className="info-box">
        <strong>How it works:</strong> Register with your details, connect MetaMask wallet, 
        and capture your face. Your face data is stored as 128 numbers (not photos) for privacy.
      </div>

      {message.text && (
        <div className={message.type}>{message.text}</div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="voterID">Voter ID</label>
            <input
              type="text"
              id="voterID"
              name="voterID"
              value={formData.voterID}
              onChange={handleInputChange}
              placeholder="Enter your voter ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Wallet Address (MetaMask)</label>
            <div className="wallet-info">
              {formData.walletAddress ? (
                <>
                  <span className="address">{formData.walletAddress}</span>
                  <button type="button" onClick={connectMetaMask} className="btn-secondary">
                    Change
                  </button>
                </>
              ) : (
                <button type="button" onClick={connectMetaMask} className="btn-secondary">
                  Connect MetaMask
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Face Capture</label>
            {!showCamera && !faceEmbedding && (
              <button 
                type="button" 
                onClick={() => setShowCamera(true)}
                className="btn-primary"
              >
                Start Face Capture
              </button>
            )}
            
            {showCamera && (
              <WebcamCapture 
                onCapture={handleFaceCapture} 
                mode="register"
                loading={loading}
              />
            )}

            {faceEmbedding && !showCamera && (
              <div className="success">
                ✓ Face captured successfully
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
            type="submit" 
            className="btn-primary"
            disabled={loading || !faceEmbedding}
          >
            {loading ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
