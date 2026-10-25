// Smart Contract ABI (Application Binary Interface)
// This tells Ethers.js how to interact with your Voting contract
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      }
    ],
    "name": "addCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "candidates",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "voteCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "candidatesCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_candidateId",
        "type": "uint256"
      }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCandidates",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "voteCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct Voting.Candidate[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "voters",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "candidateId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "VotedEvent",
    "type": "event"
  }
];

// TODO: Replace with your deployed contract address on Sepolia testnet
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

import { ethers } from 'ethers';

/**
 * Get contract instance
 * @param {boolean} needsSigner - If true, returns contract with signer (for write operations)
 * @returns {Promise<ethers.Contract>}
 */
export const getContract = async (needsSigner = false) => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  if (needsSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }
  
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
};

/**
 * Get read-only contract instance using a standard JSON-RPC provider.
 * Does not require MetaMask or any browser wallet extension.
 * Reads RPC endpoint from import.meta.env.VITE_RPC_URL with fallback to http://127.0.0.1:8545.
 * @returns {ethers.Contract}
 */
export const getReadOnlyContract = () => {
  const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';

  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Voting smart contract address is not configured. Please deploy the contract and update VITE_CONTRACT_ADDRESS.');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
};

/**
 * Get connected MetaMask account
 * @returns {Promise<string|null>}
 */
export const getAccount = async () => {
  if (typeof window.ethereum === 'undefined') {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting account:', error);
    return null;
  }
};

/**
 * Check if MetaMask is installed and connected
 * @returns {Promise<boolean>}
 */
export const isMetaMaskConnected = async () => {
  const account = await getAccount();
  return account !== null;
};

/**
 * Request account access from MetaMask
 * @returns {Promise<string[]>}
 */
export const connectMetaMask = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }

  return await window.ethereum.request({ method: 'eth_requestAccounts' });
};

/**
 * Listen for account changes
 * @param {Function} callback - Function to call when account changes
 */
export const onAccountChange = (callback) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
      callback(accounts[0] || null);
    });
  }
};

/**
 * Listen for network changes
 * @param {Function} callback - Function to call when network changes
 */
export const onNetworkChange = (callback) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('chainChanged', (chainId) => {
      callback(chainId);
    });
  }
};

export { CONTRACT_ADDRESS, CONTRACT_ABI };
