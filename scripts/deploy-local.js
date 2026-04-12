const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying Voting contract to local network...");
  
  // Get the contract factory
  const Voting = await hre.ethers.getContractFactory("Voting");
  
  // Deploy the contract
  const voting = await Voting.deploy();
  
  // Wait for deployment to finish
  await voting.waitForDeployment();
  
  // Get the deployed contract address
  const contractAddress = await voting.getAddress();
  
  console.log("✅ Voting contract deployed to:", contractAddress);
  console.log("\nAdd this address to your frontend .env.local file:");
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
  
  // Save deployment info to a file
  const deploymentInfo = {
    contractAddress,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    network: hre.network.name
  };
  
  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to deployment.json");
  
  // Add some test candidates
  console.log("\nAdding test candidates...");
  await voting.addCandidate("Alice Johnson");
  await voting.addCandidate("Bob Smith");
  await voting.addCandidate("Charlie Brown");
  console.log("✅ Added 3 test candidates: Alice Johnson, Bob Smith, Charlie Brown");
  
  console.log("\n🎉 Setup complete! Your local blockchain is ready.");
  console.log("📋 Next steps:");
  console.log("   1. Copy the contract address above");
  console.log("   2. Update frontend/.env.local with the address");
  console.log("   3. Start the frontend: npm run dev");
  console.log("   4. Open MetaMask and connect to localhost:8545");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
