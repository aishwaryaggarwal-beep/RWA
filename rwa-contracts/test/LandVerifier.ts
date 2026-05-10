import { expect } from "chai";
import { ethers } from "hardhat";

describe("LandVerifier Consensus Engine", function () {
  async function deployFixture() {
    const [owner, validator1, validator2, validator3, seller] = await ethers.getSigners();
    const LandVerifier = await ethers.getContractFactory("LandVerifier");
    const verifier = await LandVerifier.deploy();

    // Initial validator is the owner. Add more to test majority logic.
    await verifier.addValidator(validator1.address);
    await verifier.addValidator(validator2.address);
    // Total validators = 3 (Owner, Val1, Val2). Majority = 2.

    return { verifier, owner, validator1, validator2, validator3, seller };
  }

  it("Should require majority consensus to verify a land asset", async function () {
    const { verifier, owner, validator1, validator2, seller } = await deployFixture();

    const landId = 101;
    const title = "Majestic Hills Farm";
    const metadata = "ipfs://QmMetadataHash";

    // 1. Register land (By a validator/system)
    await (verifier as any).connect(validator1).registerLand(landId, title, seller.address, metadata);

    // Explicitly destructure return values to help IDE types
    let [isVerified, approvals, rejections]: [boolean, bigint, bigint] = await verifier.getLandStatus(landId);
    expect(isVerified).to.be.false;
    expect(Number(approvals)).to.equal(0);

    // 2. First Vote (Approve)
    console.log("   --- casting first approval ---");
    await (verifier as any).connect(owner).voteOnLand(landId, true);

    [isVerified, approvals, rejections] = await verifier.getLandStatus(landId);
    expect(isVerified).to.be.false; // Still false (1/3 approvals)
    expect(Number(approvals)).to.equal(1);
    console.log(`   Status after 1 vote: Verified = ${isVerified} (Approvals: ${approvals})`);

    // 3. Second Vote (Majority Reached!)
    console.log("   --- casting second approval (Consensus Meta!) ---");
    await (verifier as any).connect(validator2).voteOnLand(landId, true);

    [isVerified, approvals, rejections] = await verifier.getLandStatus(landId);
    expect(isVerified).to.be.true; // Threshold reached! (2/3 approvals)
    expect(Number(approvals)).to.equal(2);
    console.log(`   Final Status: Verified = ${isVerified} (Approvals: ${approvals})`);
  });

  it("Should reject if majority of validators vote no", async function () {
    const { verifier, owner, validator1, validator2, seller } = await deployFixture();
    const landId = 102;

    await (verifier as any).connect(owner).registerLand(landId, "Fraudulent Plot", seller.address, "ipfs://fake");

    await (verifier as any).connect(validator1).voteOnLand(landId, false); // Reject
    await (verifier as any).connect(validator2).voteOnLand(landId, false); // Reject (Majority 2/3)

    const [isVerified, approvals, rejections] = await verifier.getLandStatus(landId);
    expect(isVerified).to.be.false; // Should be permanently rejected
    expect(Number(rejections)).to.equal(2);
  });
});
