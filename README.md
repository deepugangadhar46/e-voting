# Blockchain-Based E-Voting System with Biometric Authentication

A secure, transparent, and tamper-proof voting system built on Ethereum blockchain with facial recognition authentication.

## Features

- **Biometric Authentication**: Face recognition with liveness detection (reduces photo spoofing risk)
- **Blockchain Security**: Votes recorded permanently on Ethereum blockchain
- **Double-Vote Prevention**: Smart contract enforces one vote per wallet
- **Transparency**: Real-time results visible to anyone without requiring MetaMask
- **Privacy**: Face data stored as numerical embeddings instead of raw images

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js, Vite, face-api.js |
| Backend | Node.js, Express, MongoDB, JWT |
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
│   ├── middleware/     # Auth & role verification middleware
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
JWT_SECRET=your_jwt_secret_random_64_characters
ADMIN_WALLET_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Frontend `.env.local`
```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_RPC_URL=http://127.0.0.1:8545
```

**⚠️ SECURITY WARNING**: Never commit `.env` files to Git. They are already in `.gitignore`.

## Quick Start

### 1. Install Dependencies

```bash
# Run root setup to install all dependencies at once:
npm run setup

# Or install manually in each folder:
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
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

Make sure MongoDB is running locally (`net start MongoDB` on Windows), or update `backend/.env` with your MongoDB Atlas URI.

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

Copy the contract address from the output and update `frontend/.env.local`.

### 5. Update Frontend Config

Update `frontend/.env.local` with the deployed contract address:

```env
VITE_CONTRACT_ADDRESS=0xYourContractAddressHere
VITE_RPC_URL=http://127.0.0.1:8545
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

> **Tip (Windows shortcut)**: Alternatively, you can start Hardhat, deploy the contract, and launch both backend and frontend in one command:
> ```powershell
> npm run dev:windows
> ```

### 7. Configure MetaMask

1. Open MetaMask → Settings → Networks → Add Network
2. Enter details:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

3. Import a test account from Hardhat node (Account #0 is the Admin: check terminal for private key).

### 8. Access the Application

Open browser: `http://localhost:3000`

## How It Works

### Face Recognition Flow

1. **Registration**: User captures face → 128-dimension embedding extracted → Saved to MongoDB
2. **Login**: User captures live face → Compared with stored embedding using Euclidean distance
3. **Liveness Detection**: System requires passing a randomized head movement challenge to prevent photo spoofing

### Head Movement Liveness Logic

The system uses facial landmarks to ensure the user is live and responding to a random challenge:

- **Baseline**: The user looks straight at the camera to establish their baseline eye-to-nose ratio.
- **Challenge**: The user is randomly asked to turn their head `LEFT` or `RIGHT`.
- **Detection**: 
  - Turn Left: Ratio increases relative to baseline (`ratio > baseline * 1.35`).
  - Turn Right: Ratio decreases relative to baseline (`ratio < baseline * 0.65`).
- **Timeout**: The user must complete the challenge within 15 seconds.

### Blockchain Flow

1. **Registration**: Voter registers details and face embedding.
2. **Voting**: Authenticated voter connects MetaMask → Smart contract verifies voter has not voted → Records vote → Emits event.
3. **Results**: Anyone can query live vote counts directly from blockchain via a read-only provider (no MetaMask required).

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Register | `/` or `/register` | Voter registration with face capture |
| Login | `/login` | Face verification with liveness detection |
| Vote | `/vote` | Cast vote (requires login & MetaMask) |
| Results | `/results` | Live vote counts from blockchain (no MetaMask needed) |
| Admin | `/admin` | Add candidates (admin only) |

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new voter | Public |
| POST | `/verify` | Verify face and return JWT session | Public |
| GET | `/verify/session` | Get authenticated voter profile | Protected (JWT) |
| GET | `/health` | Server health check | Public |

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

1. **Double-Vote Prevention**: Smart contract mapping tracks voters on-chain.
2. **Liveness Detection**: Randomized active head movement challenge to prevent photo spoofing.
3. **Duplicate Registration Prevention**: Prevents registering similar biometric identities using strict distance thresholds.
4. **JWT Authentication**: Protected routes verify signed JWT sessions with role-based access.
5. **Blockchain Immutability**: Votes cannot be altered once cast.
6. **Privacy**: Numerical face embeddings stored instead of raw photos.

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
- **Liveness Detection**: Head movement challenge is an improvement over blinks; real-world environments require good lighting.
- **Scale**: Currently designed for small-scale elections (classroom, college level)
- **Dependencies**: Voting requires internet connection and MetaMask browser extension; viewing results does not.
- **Hardware Requirements**: Webcam needed for face capture

## Demo Flow

1. **Register**: Voter enters name, ID, wallet address, captures face
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
- [ ] View results in real-time without MetaMask

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

### "Results not loading from blockchain"
- Confirm Hardhat node is running on port 8545
- Verify `VITE_CONTRACT_ADDRESS` is set in `frontend/.env.local`
- If testing on mobile, set `VITE_RPC_URL` to your computer's LAN IP instead of `127.0.0.1`

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
