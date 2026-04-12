import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Vote from './pages/Vote';
import Results from './pages/Results';
import Admin from './pages/Admin';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-content">
            <h1>Blockchain Voting</h1>
            <div className="nav-links">
              <Link to="/">Register</Link>
              <Link to="/login">Login</Link>
              <Link to="/vote">Vote</Link>
              <Link to="/results">Results</Link>
              <Link to="/admin">Admin</Link>
            </div>
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/vote" element={<Vote />} />
            <Route path="/results" element={<Results />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
