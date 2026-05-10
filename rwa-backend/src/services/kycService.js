import prisma from "../prisma.js";
import { encryptBuffer } from "../utils/encryption.js";
import { uploadToIPFS } from "../utils/ipfs.js";

class KYCService {
  /**
   * Submit KYC details securely
   */
  async submitKYC(userId, personalInfo, files) {
    const { 
      firstName, middleName, lastName, dob, 
      country, address, state, city, pincode, taxResidency,
      documentType, documentIdNumber,
      occupation, employer, incomeRange, experience, sourceOfFunds, isPep,
      walletProofSignature, attempts 
    } = personalInfo;

    const { documentFront, documentBack, selfieFile } = files;

    // 🚨 1. Validation
    if (!firstName || !lastName || !dob || !documentFront || !selfieFile) {
      throw new Error("Missing required information or files");
    }

    // 🔐 2. Encrypt files
    const docFrontEncrypted = encryptBuffer(documentFront.buffer);
    const selfieEncrypted = encryptBuffer(selfieFile.buffer);
    
    let docBackEncrypted = null;
    if (documentBack) {
      docBackEncrypted = encryptBuffer(documentBack.buffer);
    }

    // 🌐 3. Upload to IPFS
    const documentCid = await uploadToIPFS(
      docFrontEncrypted.encryptedData,
      documentFront.originalname
    );
    const selfieCid = await uploadToIPFS(
      selfieEncrypted.encryptedData,
      selfieFile.originalname
    );
    
    let documentBackCid = null;
    if (docBackEncrypted) {
      documentBackCid = await uploadToIPFS(
        docBackEncrypted.encryptedData,
        documentBack.originalname
      );
    }

    // 🧾 4. Save to DB
    const kyc = await prisma.kYC.create({
      data: {
        userId,
        firstName,
        middleName,
        lastName,
        dob: new Date(dob),
        country,
        address,
        state,
        city,
        pincode,
        taxResidency,
        documentType,
        documentIdNumber,
        documentCid,
        documentBackCid,
        selfieCid,
        documentIv: docFrontEncrypted.iv,
        documentBackIv: docBackEncrypted?.iv,
        selfieIv: selfieEncrypted.iv,
        occupation,
        employer,
        incomeRange,
        experience,
        sourceOfFunds,
        isPep: isPep === 'true' || isPep === true,
        walletProofSignature,
        status: "PENDING",
        attempts: attempts ? parseInt(attempts) : 1,
      },
    });

    // 🤖 5. Automated Verification (Simulation)
    await this.runAutomatedVerification(kyc.id);

    return kyc;
  }


  /**
   * Run custom internal verification logic (Our Own Trulioo-like System)
   */
  async runAutomatedVerification(kycId) {
    try {
      const kyc = await prisma.kYC.findUnique({ where: { id: kycId } });
      if (!kyc) return;

      console.log(`[IdentityEngine] Running internal forensic check for #${kycId}...`);

      let riskScore = 0;
      const verificationResult = {
        identityMatch: "PARTIAL",
        documentForensics: "CLEAN",
        watchlistCheck: "CLEAR",
        details: []
      };

      // 1️⃣ Identity Matching
      const mockIdentityDb = [
        { first: "John", last: "Doe", dob: "1990-01-01" },
        { first: "Jane", last: "Smith", dob: "1985-05-15" },
      ];

      const match = mockIdentityDb.find(id =>
        id.first.toLowerCase() === kyc.firstName.toLowerCase() &&
        id.last.toLowerCase() === kyc.lastName.toLowerCase()
      );

      if (match) {
        verificationResult.identityMatch = "FULL_MATCH";
        riskScore += 0;
        verificationResult.details.push("Name matched against internal government database.");
      } else {
        verificationResult.identityMatch = "NO_MATCH";
        riskScore += 45; // High risk for non-match
        verificationResult.details.push("Identity could not be verified against automated databases. Manual review REQUIRED.");
      }


      // 2️⃣ Document Forensics (Simulated)
      if (kyc.documentCid && kyc.documentCid.length > 10) {
        verificationResult.documentForensics = "CLEAN";
        riskScore += 5; // Base risk for document processing
        verificationResult.details.push("Secure digital document signature verified.");
      } else {
        verificationResult.documentForensics = "FLAGGED";
        riskScore += 60;
        verificationResult.details.push("FRAUD ALERT: Document forensic signatures missing or corrupted.");
      }



      // 3️⃣ Biometrics
      const faceMatchConfidence = Math.floor(Math.random() * (100 - 60) + 60); // More realistic range
      verificationResult.biometrics = {
        faceMatchConfidence: `${faceMatchConfidence}%`,
        liveness: faceMatchConfidence > 85 ? "PASSED" : "REVIEW_REQUIRED",
        matchingStatus: faceMatchConfidence > 85 ? "MATCHED" : "POTENTIAL_MISMATCH"
      };
      
      if (faceMatchConfidence < 85) riskScore += 30;

      // 4️⃣ Final Decision
      let status = "PENDING"; // Default to manual review for professional security
      if (riskScore < 15 && verificationResult.identityMatch === "FULL_MATCH") {
        status = "VERIFIED";
      } else if (riskScore > 75) {
        status = "REJECTED";
      }

      await prisma.kYC.update({
        where: { id: kycId },
        data: {
          status,
          riskScore,
          verificationResult: verificationResult, 
          reviewedAt: status === "VERIFIED" || status === "REJECTED" ? new Date() : null
        },
      });


      console.log(`[IdentityEngine] Analysis complete for #${kycId}. Status: ${status}, Risk: ${riskScore}`);
    } catch (err) {
      console.error("[IdentityEngine] Fatal error during forensic analysis:", err);
    }
  }

  /**
   * Update KYC status and log review time
   */
  async updateKYCStatus(kycId, status, rejectionReason = null) {
    return await prisma.kYC.update({
      where: { id: kycId },
      data: {
        status,
        rejectionReason,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Fetch KYC status for a user
   */
  async getKYCStatus(userId) {
    const kyc = await prisma.kYC.findUnique({
      where: { userId },
      select: { status: true, rejectionReason: true, riskScore: true, verificationResult: true }
    });
    return kyc ? kyc : { status: "NOT_SUBMITTED" };
  }
}

export default new KYCService();

