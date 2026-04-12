import { expect } from "chai";
import hre from "hardhat";

describe("Voting Contract", function () {
  let Voting;
  let voting;
  let admin;
  let voter1;
  let voter2;

  before(async function () {
    // Get the signers (simulated user wallets/accounts) provided by Hardhat
    [admin, voter1, voter2] = await hre.ethers.getSigners();

    // Deploy the Voting smart contract to the local test blockchain
    const factory = await hre.ethers.getContractFactory("Voting");
    voting = await factory.deploy();
    await voting.waitForDeployment();
  });

  describe("Core Voting Flow", function () {
    it("Should allow admin to add candidates", async function () {
      // Connect to the contract as the admin and add candidates
      await voting.connect(admin).addCandidate("Alice");
      await voting.connect(admin).addCandidate("Bob");
      
      // Check if 2 candidates were added
      expect(await voting.candidatesCount()).to.equal(2);
    });

    it("Should allow a voter to cast a single vote", async function () {
      // voter1 casts a vote for Candidate #1
      await voting.connect(voter1).castVote(1);
      
      // Fetch Candidate #1 and ensure their voteCount went up to 1
      const candidate = await voting.candidates(1);
      expect(candidate.voteCount).to.equal(1);
      
      // Ensure the voter is permanently marked as having voted
      expect(await voting.voters(voter1.address)).to.be.true;
    });

    it("Should REJECT a vote if the user deliberately tries to vote twice", async function () {
      // Try to vote again with voter1 (who already voted above)
      // This MUST be reverted by the blockchain rule: `require(!voters[msg.sender])`
      await expect(
        voting.connect(voter1).castVote(2)
      ).to.be.revertedWith("You have already voted.");
    });
  });
});
