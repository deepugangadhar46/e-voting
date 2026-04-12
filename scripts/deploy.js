const hre = require("hardhat");

async function main() {
  console.log("Starting local deployment simulation...");
  
  // 1. Get simulated user accounts from Hardhat
  const [admin, voter1] = await hre.ethers.getSigners();
  console.log("Admin Address:", admin.address);

  // 2. Deploy our Smart Contract
  const factory = await hre.ethers.getContractFactory("Voting");
  const voting = await factory.deploy();
  await voting.waitForDeployment();
  const contractAddress = await voting.getAddress();
  
  console.log("Voting Smart Contract deployed to:", contractAddress);

  // 3. Admin adds candidates
  console.log("Adding Candidates...");
  await voting.connect(admin).addCandidate("Alice");
  await voting.connect(admin).addCandidate("Bob");
  let totalCandidates = await voting.candidatesCount();
  console.log("Total candidates added:", totalCandidates.toString());

  // 4. Voter 1 Casts a Vote
  console.log("Voter 1 is casting a vote for Candidate 1...");
  await voting.connect(voter1).castVote(1);
  
  // Verify it was counted
  const candidate = await voting.candidates(1);
  console.log(`${candidate.name} now has ${candidate.voteCount} votes!`);

  // Verify they cannot vote twice
  try {
    console.log("Voter 1 is trying to cast a SECOND vote...");
    await voting.connect(voter1).castVote(2);
    console.log("ERROR: They succeeded? (This shouldn't happen!)");
  } catch (error) {
    console.log("SUCCESS: The blockchain rejected the second vote!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
