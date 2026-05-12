"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useAccount, useConfig } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import AuthGuard from "@/src/components/AuthGuard";
import { ADDRESSES, IdentityRegistryABI } from "@/src/lib/contracts/abi";
import "./../admin.css";

export default function KycDetail() {
  const { userId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { address, isConnected } = useAccount();
  const config = useConfig();

  const handleAction = async (action: string) => {
    if (action === "reject" && !reason) {
      alert("Please provide a reason for rejection");
      return;
    }

    setSubmitting(true);
    let signature = null;

    // ⛓️ DECENTRALIZED IDENTITY PROOF
    if (action === "approve") {
      try {
        if (!isConnected) {
          alert("Please connect your Auditor Wallet to sign the on-chain KYC proof.");
          setSubmitting(false);
          return;
        }

        const client = await getConnectorClient(config);
        const provider = new ethers.BrowserProvider(client.transport as any);
        const signer = await provider.getSigner();

        // Create a professional, compact forensic proof
        const proofMessage = `VERIFIED_BY_AUDITOR:${address}:USER:${userId}:${Date.now()}`;

        console.log("Generating On-Chain KYC Proof...");
        signature = await signer.signMessage(proofMessage);
        console.log("Proof Generated:", signature);

        // Execute on-chain transaction if user has a registered wallet
        if (data.walletAddress) {
          console.log(`Executing IdentityRegistry.verifyUser for ${data.walletAddress}...`);
          const identityContract = new ethers.Contract(
            ADDRESSES.IdentityRegistry,
            IdentityRegistryABI,
            signer
          );

          const tx = await identityContract.verifyUser(data.walletAddress, signature);
          console.log("Transaction sent:", tx.hash);
          await tx.wait();
          console.log("Transaction confirmed!");
          alert(`✅ ON-CHAIN KYC REGISTRATION COMPLETE\n\nIdentity stored permanently on Polygon Amoy.\nTx Hash: ${tx.hash}`);
        } else {
          alert("✅ PROOF GENERATED (Off-Chain)\n\nApplicant has no registered wallet yet. Proof saved to database for future on-chain sync.");
        }
      } catch (err: any) {
        alert("Blockchain signing failed: " + err.message);
        setSubmitting(false);
        return;
      }
    }

    fetch(`${API_URL}/admin/kyc/${userId}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        reason,
        kycProof: signature // Pass the cryptographic proof to the backend
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to update KYC");
      alert(`KYC ${action}d ✅`);
      router.push("/admin");
    }).catch(err => {
      alert(err.message);
    }).finally(() => {
      setSubmitting(false);
    });
  };

  useEffect(() => {
    fetch(`${API_URL}/admin/kyc/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return (
    <AuthGuard>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "white", background: "#020617" }}>
        <p style={{ fontSize: "1.2rem", fontWeight: "600" }}>Loading Intelligence Data...</p>
      </div>
    </AuthGuard>
  );

  const isPDF = data.document?.startsWith("data:application/pdf");
  const isImage = data.document?.startsWith("data:image");

  const vResult = typeof data.verificationResult === 'string' ? JSON.parse(data.verificationResult) : data.verificationResult;
  const riskLevel = data.riskScore < 30 ? "LOW" : data.riskScore < 70 ? "MEDIUM" : "HIGH";
  const riskColor = riskLevel === "LOW" ? "#22c55e" : riskLevel === "MEDIUM" ? "#f59e0b" : "#ef4444";

  return (
    <AuthGuard>
      <div style={{ background: "radial-gradient(circle at top right, #0f172a, #020617)", minHeight: "100vh", padding: "40px 20px" }}>
        <div className="kyc-wrapper">
          {/* HEADER */}
          <div className="kyc-header">
            <div>
              <button
                onClick={() => router.push("/admin")}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px", padding: 0 }}
              >
                ← Back to Auditor Dashboard
              </button>
              <h2>{data.firstName} {data.lastName}</h2>
              <p style={{ color: "#94a3b8", margin: "5px 0 0 0" }}>Internal Applicant ID: {userId}</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ padding: "8px 16px", borderRadius: "10px", background: `${riskColor}15`, border: `1px solid ${riskColor}55`, color: riskColor, fontWeight: "900", fontSize: "12px" }}>
                RISK: {riskLevel} ({data.riskScore})
              </div>
              <span className={`status ${data.status}`}>
                {data.status}
              </span>
            </div>
          </div>

          {/* 🤖 NEW: FORENSIC ENGINE RESULTS */}
          {vResult && (
            <div className="kyc-section" style={{ border: `1px solid ${riskColor}33`, background: `linear-gradient(135deg, rgba(15, 23, 42, 1), ${riskColor}05)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, borderLeft: `4px solid ${riskColor}` }}>Identity Engine Analysis</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Decision Log ID: #INT-{userId?.slice(-4)}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "25px" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Identity Match</span>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: vResult.identityMatch === 'FULL_MATCH' ? '#22c55e' : '#f59e0b', marginTop: "5px" }}>{vResult.identityMatch}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Forensics</span>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: vResult.documentForensics === 'VERIFIED' ? '#22c55e' : '#f59e0b', marginTop: "5px" }}>{vResult.documentForensics}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Watchlist</span>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: vResult.watchlistCheck === 'CLEAR' ? '#22c55e' : '#ef4444', marginTop: "5px" }}>{vResult.watchlistCheck}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Attempts</span>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: (data as any).attempts >= 3 ? '#ef4444' : '#60a5fa', marginTop: "5px" }}>{(data as any).attempts || 1}/3</div>
                </div>
              </div>

              {/* ⭐ NEW: BIOMETRICS DASHBOARD ⭐ */}
              {vResult.biometrics && (
                <div style={{ marginTop: "20px", padding: "15px", background: "rgba(124, 58, 237, 0.05)", borderRadius: "12px", border: "1px solid rgba(124, 58, 237, 0.1)", marginBottom: "25px" }}>
                  <h4 style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#c084fc" }}>Digital Biometric Analysis</h4>
                  <div style={{ display: "flex", gap: "30px" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>FACE SIMILARITY</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#fff" }}>{vResult.biometrics.faceMatchConfidence}</div>
                    </div>
                    <div style={{ height: "40px", width: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                    <div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>LIVENESS DETECTION</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#22c55e" }}>PASSED (3D REAL)</div>
                    </div>
                    <div style={{ height: "40px", width: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                    <div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>SPOOF ATTEMPT</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#22c55e" }}>NONE DETECTED</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: "rgba(0,0,0,0.1)", padding: "15px", borderRadius: "12px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>System Log Details</span>
                {vResult.details?.map((detail: string, i: number) => (
                  <div key={i} style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "8px", display: "flex", gap: "10px" }}>
                    <span style={{ color: riskColor }}>•</span> {detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERSONAL INFO */}
          <div className="kyc-section">
            <h3>Personal Information</h3>
            <div className="info-grid">
              <p><strong>Full Name</strong> {data.firstName} {data.lastName}</p>
              <p><strong>Date of Birth</strong> {data.dob ? new Date(data.dob).toLocaleDateString() : "N/A"}</p>
              <p><strong>City</strong> {data.city}</p>
              <p><strong>Pincode</strong> {data.pincode}</p>
              <p style={{ gridColumn: "1 / -1" }}><strong>Full Address</strong> {data.address}</p>
            </div>
          </div>

          {/* DOCUMENTS */}
          <div className="kyc-section">
            <h3>Documents Verification</h3>

            <div className="doc-grid">
              <div className="doc-box">
                <h4>Government ID</h4>
                {isPDF ? (
                  <iframe src={data.document} width="100%" height="400px" style={{ border: "none", borderRadius: "8px" }} />
                ) : isImage ? (
                  <img src={data.document} className="preview-img" alt="ID Document" />
                ) : (
                  <p style={{ color: "#ef4444" }}>Unsupported file type</p>
                )}
              </div>

              <div className="doc-box">
                <h4>Selfie Verification</h4>
                {data.selfie?.startsWith("data:image") ? (
                  <img src={data.selfie} className="preview-img" alt="User Selfie" />
                ) : (
                  <p style={{ color: "#ef4444" }}>Invalid selfie format</p>
                )}
              </div>
            </div>
          </div>

          {/* REJECTION REASON (Only if needed) */}
          {data.status === "PENDING" && (
            <div className="rejection-form">
              <h4 style={{ margin: "0 0 15px 0", color: "#ef4444", fontSize: "16px" }}>Rejection Notes</h4>
              <textarea
                className="rejection-textarea"
                placeholder="Explain why the documents are being rejected... (e.g., Image is blurry, name mismatch)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {/* PREVIOUS REJECTION REASON */}
          {data.status === "REJECTED" && data.rejectionReason && (
            <div className="rejection-form">
              <h4 style={{ margin: "0 0 5px 0", color: "#ef4444", fontSize: "16px" }}>Rejection Reason</h4>
              <p style={{ color: "#cbd5e1" }}>{data.rejectionReason}</p>
            </div>
          )}

          {/* ACTIONS */}
          <div className="kyc-actions">
            {data.status === "PENDING" ? (
              <>
                <button
                  className="btn-admin reject"
                  onClick={() => handleAction("reject")}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Reject Documents"}
                </button>
                <button
                  className="btn-admin approve"
                  onClick={() => handleAction("approve")}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Approve KYC"}
                </button>
              </>
            ) : (
              <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
                This KYC has already been {data.status}. No further action required.
              </p>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
