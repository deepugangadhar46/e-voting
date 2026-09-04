# Blockchain-Based E-Voting System with Biometric Authentication

A secure, transparent, and tamper-proof voting system built on Ethereum blockchain with facial recognition authentication.

## Features

- **Biometric Authentication**: Face recognition with liveness detection (reduces photo spoofing risk)
- **Blockchain Security**: Votes recorded permanently on Ethereum blockchain
- **Double-Vote Prevention**: Smart contract enforces one vote per wallet
- **Transparency**: Real-time results visible to anyone
- **Privacy**: Face data stored as numerical embeddings instead of raw images

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js, Vite, face-api.js |
| Backend | Node.js, Express, MongoDB |
| Blockchain | Solidity, Hardhat, Ethers.js |
| Authentication | Face recognition + MetaMask |

## Project Structure

```
blockchain-voting/
├── contracts/          # Solidity smart contracts
│   └── Voting.sol      # Main voting contract
├── scripts/            # Deployment scripts
│   ├── deploy.js       # Local deployment
│   └── deploy-local.js # Local network deployment
├── test/               # Contract tests
│   └── voting.test.js  # Unit tests
├── backend/            # Node.js API server
│   ├── index.js        # Server entry
│   ├── models/         # MongoDB schemas
│   └── routes/         # API endpoints
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   └── utils/      # Utilities
│   └── public/models/  # face-api.js models
└── hardhat.config.js   # Hardhat configuration
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- MetaMask browser extension
- Webcam (for face recognition)

## Environment Variables

Create `.env` files in the following locations:

### Root `.env` (for Hardhat - only needed for Sepolia deployment)
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key_here
```

### Backend `.env`
```env
MONGODB_URI=mongodb://localhost:27017/voting-system
PORT=5000
```

### Frontend `.env.local`
```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

**⚠️ SECURITY WARNING**: Never commit `.env` files to Git. They are already in `.gitignore`.

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
cd blockchain-voting
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Download Face-API Models

Download these files to `frontend/public/models/`:

```bash
# Windows PowerShell
mkdir frontend\public\models

# Download models (run in PowerShell)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json" -OutFile "frontend\public\models\tiny_face_detector_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1" -OutFile "frontend\public\models\tiny_face_detector_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json" -OutFile "frontend\public\models\face_landmark_68_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1" -OutFile "frontend\public\models\face_landmark_68_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json" -OutFile "frontend\public\models\face_recognition_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1" -OutFile "frontend\public\models\face_recognition_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2" -OutFile "frontend\public\models\face_recognition_model-shard2"
```

### 3. Start MongoDB

Make sure MongoDB is running locally, or update `backend/.env` with your MongoDB Atlas URI.

### 4. Deploy Smart Contract (Local)

**Terminal 1 - Start Hardhat Node:**
```bash
cd blockchain-voting
npx hardhat node
```

**Terminal 2 - Deploy Contract:**
```bash
cd blockchain-voting
npx hardhat run scripts/deploy-local.js --network localhost
```

Copy the contract address from the output.

### 5. Update Frontend Config

Update `frontend/.env.local` with the contract address:

```env
VITE_CONTRACT_ADDRESS=0xYourContractAddressHere
```

### 6. Start All Services

**Terminal 3 - Backend:**
```bash
cd blockchain-voting/backend
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd blockchain-voting/frontend
npm run dev
```

### 7. Configure MetaMask

1. Open MetaMask → Settings → Networks → Add Network
2. Enter details:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

3. Import a test account from Hardhat node (check the terminal for private keys)

### 8. Access the Application

Open browser: `http://localhost:3000`

## How It Works

### Face Recognition Flow

1. **Registration**: User captures face → 128-dimension embedding extracted → Saved to MongoDB
2. **Login**: User captures live face → Compared with stored embedding using Euclidean distance
3. **Liveness Detection**: System requires passing a randomized head movement challenge to prevent photo spoofing

### Head Movement Liveness Logic

The system uses facial landmarks to ensure the user is live and responding to a random challenge:

- **Baseline**: The system requires the user to face forward (ratio of distance between eyes and nose must be ~1.0).
- **Challenge**: The user is randomly asked to turn their head `LEFT` or `RIGHT`.
- **Detection**: 
  - Turn Left: The left eye distance to nose ratio exceeds `1.4`.
  - Turn Right: The ratio drops below `0.6`.
- **Timeout**: The user must complete the challenge within 15 seconds.



### Blockchain Flow

1. **Registration**: Voter connects MetaMask → Face verified → Data stored
2. **Voting**: Smart contract checks if voter already voted → Records vote → Emits event
3. **Results**: Anyone can query vote counts directly from blockchain

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Register | `/` | Voter registration with face capture |
| Login | `/login` | Face verification with liveness detection |
| Vote | `/vote` | Cast vote (requires login) |
| Results | `/results` | Live vote counts from blockchain |
| Admin | `/admin` | Add candidates (admin only) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new voter |
| POST | `/verify` | Verify face and return voter info |
| GET | `/health` | Server health check |

### Request/Response Examples

**Register:**
```json
POST /register
{
  "name": "John Doe",
  "voterID": "VOTER123",
  "walletAddress": "0x...",
  "faceEmbedding": [0.23, 0.45, ...]  // 128 numbers
}
```

**Verify:**
```json
POST /verify
{
  "faceEmbedding": [0.23, 0.45, ...],
  "voterID": "VOTER123"  // optional
}

Response:
{
  "match": true,
  "voter": {
    "name": "John Doe",
    "voterID": "VOTER123",
    "walletAddress": "0x..."
  }
}
```

## Smart Contract

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `addCandidate(string name)` | Admin | Add new candidate |
| `castVote(uint256 candidateId)` | Public | Cast vote (one per wallet) |
| `getCandidates()` | Public | Get all candidates |
| `candidates(uint256 id)` | Public | Get candidate details |
| `voters(address)` | Public | Check if address voted |

### Events

```solidity
event VotedEvent(uint256 indexed candidateId, address indexed voter);
```

## Security Features

1. **Double-Vote Prevention**: Smart contract mapping tracks voters
2. **Liveness Detection**: Randomized active head movement challenge to prevent photo spoofing
3. **Duplicate Registration Prevention**: Prevents registering similar biometric identities using strict distance thresholds.
4. **Blockchain Immutability**: Votes cannot be altered
5. **Privacy**: Face embeddings stored, not photos

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    MongoDB      │
│  (React + Vite) │     │ (Express +      │     │  (Face + User   │
│                 │     │   face-api.js)  │     │      Data)      │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐
         └─────────────▶│  Smart Contract │
            (Ethers.js) │   (Voting.sol)  │
                        │                 │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Local Hardhat  │
                        │   / Sepolia     │
                        └─────────────────┘
```

## Development Testing

During development, you may need to reset the system to repeatedly test registration, face verification, and voting logic.

### 1. Resetting MongoDB Data
To clear all test voters and their face embeddings from the local database, run from the root directory:
```bash
npm run reset:test
```
*Note: This command includes safety checks and will abort if it detects a production environment.*

### 2. Resetting Blockchain State
**Important:** Running `npm run reset:test` ONLY clears the database, not the blockchain. Because blockchain transactions are immutable, you cannot simply "delete" votes. Instead, you must spin up a completely fresh local blockchain.

To completely reset the test environment (including blockchain votes):
1. Stop your currently running development server (Press `Ctrl+C` in the terminal where you ran `npm run dev:windows`).
2. Start it again with `npm run dev:windows`.

This will:
- Launch a fresh, empty local blockchain.
- Automatically re-deploy the `Voting` smart contract to a new address.
- Automatically sync the new contract address to the frontend's `.env.local`.

## Limitations

- **Face Recognition Accuracy**: Depends on lighting and camera quality
- **Liveness Detection**: Head movement challenge is an improvement over blinks, but advanced 3D anti-spoofing could further improve security.
- **Scale**: Currently designed for small-scale elections (classroom, college level)
- **Dependencies**: Requires internet connection and MetaMask browser extension
- **Blockchain Costs**: Real deployment requires ETH for gas fees
- **Hardware Requirements**: Webcam needed for face capture

## Demo Flow

1. **Register**: Voter enters name, ID, connects MetaMask, captures face
2. **Login**: Face verification with randomized head movement liveness detection
3. **Vote**: Select candidate and confirm with MetaMask transaction
4. **Results**: View real-time vote counts from blockchain

## Testing

### Run Contract Tests
```bash
cd blockchain-voting
npx hardhat test
```

### Manual Testing Checklist

- [ ] Register voter with face capture
- [ ] Login with face (complete head movement challenge)
- [ ] Try photo spoofing (should fail)
- [ ] Cast vote on blockchain
- [ ] Attempt double voting (should fail)
- [ ] View results in real-time

## Deployment to Sepolia Testnet

### 1. Get Sepolia ETH

Get free test ETH from:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)

### 2. Update Hardhat Config

Create `.env` in project root:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key
```

### 3. Deploy
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Update Frontend
Update `frontend/.env.local` with the Sepolia contract address.

## Common Issues

### "Failed to load face recognition models"
- Ensure model files are in `frontend/public/models/`
- Check browser console for 404 errors

### "Smart contract not deployed"
- Run Hardhat node and deploy contract
- Update `VITE_CONTRACT_ADDRESS` in `.env.local`

### "Liveness detection failing / Timing out"
- Ensure good lighting on face
- Look straight at the camera to establish baseline first
- Turn head slightly (~30 degrees) in the instructed direction
- Make sure only one face is visible in the frame

### "MetaMask not connecting"
- Add Hardhat Local network to MetaMask
- Import test account with private key
- Ensure MetaMask is on correct network

## Git Workflow

**Commit after major milestones:**
1. Smart contract complete with tests
2. Backend API working
3. Frontend with face recognition
4. Local testing successful
5. Sepolia deployment complete

```bash
# Example commits
git commit -m "feat: add voting smart contract with tests"
git commit -m "feat: implement backend API with face verification"
git commit -m "feat: add React frontend with face-api.js"
git commit -m "fix: improve blink detection algorithm"
git commit -m "test: local deployment and full flow working"
git commit -m "deploy: contract deployed to Sepolia testnet"
```

## Contributors

- Department of Information Science & Engineering
- Sri Venkateshwara College of Engineering, Bengaluru

## License

This project is for educational purposes (BE Final Year Project 2025-2026).

## Acknowledgments

- face-api.js for face recognition
- OpenZeppelin for smart contract security patterns
- Hardhat team for development environment
