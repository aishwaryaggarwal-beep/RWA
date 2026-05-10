"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount, useConfig } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import { ADDRESSES, LandVerifierABI } from "@/src/lib/contracts/abi";
import AuthGuard from "@/src/components/AuthGuard";
import { API_URL } from "@/src/lib/api";
import ParticleBackground from "@/src/components/ParticleBackground";

export default function ValidatorPage() {
  const [landList, setLandList] = useState<any[]>([]);
  const [isValidator, setIsValidator] = useState(false);
  const [selectedLand, setSelectedLand] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const { address, isConnected } = useAccount();
  const config = useConfig();

  const fetchLands = () => {
    setLoading(true);
    fetch(`${API_URL}/validator/lands`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }})
      .then(res => res.json())
      .then(data => {
          Array.isArray(data) ? setLandList(data) : setLandList([]);
          setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setAuthToken(token);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(user.id);
    if (user.role === "VALIDATOR" || user.role === "ADMIN") {
      setIsValidator(true);
      fetchLands();
    } else {
      window.location.href = "/dashboard";
    }

  }, []);


  const handleVote = async (landId: number, vote: "approve" | "reject") => {
    const action = vote === "approve" ? "Verify & Approve" : "Reject as Fraud";
    if(!confirm(`⚖️ ON-CHAIN CONSENSUS REQUIRED\nYou are about to sign a cryptographic vote on the Polygon Blockchain.\n\nAction: ${action}\nLand ID: #${landId}\n\nDo you wish to proceed?`)) return;
    
    if (!isConnected) {
        alert("Wallet not connected. Please connect your wallet to vote on-chain.");
        return;
    }

    try {
      setLoading(true);
      
      // ⛓️ STEP 1: BLOCKCHAIN TRANSACTION
      const client = await getConnectorClient(config);
      const provider = new ethers.BrowserProvider(client.transport as any);
      
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 80002) {
          alert("Please switch to Polygon Amoy Testnet (80002) to cast your vote.");
          setLoading(false);
          return;
      }

      const signer = await provider.getSigner();
      const verifier = new ethers.Contract(ADDRESSES.LandVerifier, LandVerifierABI, signer);
      
      console.log(`[On-Chain] Casting vote for Land #${landId}...`);
      const isApprove = vote === "approve";
      
      // Submit TX
      const tx = await verifier.voteOnLand(landId, isApprove);
      console.log(`[On-Chain] Transaction Sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`[On-Chain] Transaction Confirmed: ${receipt.hash}`);

      // 🌐 STEP 2: BACKEND SYNC
      const res = await fetch(`${API_URL}/validator/land/${landId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ 
            vote,
            txHash: tx.hash // Send the TX hash so backend can record it
        })
      });
      const data = await res.json();
      
      if(res.ok) {
        alert(`✅ VOTE REGISTERED ON-CHAIN!\n\nBlockchain Hash:\n${tx.hash}\n\nStatus: ${data.currentStatus}\nConsensus: ${data.progress.approvals}/${data.progress.required} Approvals`);
        setSelectedLand(null);
      } else {
        alert("On-chain vote was successful, but backend sync failed: " + data.message);
      }
      
      fetchLands(); 
    } catch(err: any) {
      const errorMsg = err.reason || err.message || "";
      if (errorMsg.includes("Land is already verified")) {
        alert("Consensus has already been reached on the blockchain for this asset. Your vote is no longer required.");
        setSelectedLand(null);
      } else if (errorMsg.includes("Validator has already voted")) {
        alert("You have already cast your vote for this asset on-chain.");
        setSelectedLand(null);
      } else {
        alert("Failed to submit on-chain vote: " + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }


  if (!isValidator) return null;

  return (
    <AuthGuard>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "40px", maxWidth: "1400px", margin: "0 auto", color: "white", minHeight: "100vh" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "50px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "25px" }}>
            <div>
              <h1 style={{ margin: 0, fontWeight: "900", fontSize: "36px", background: "linear-gradient(to right, #10b981, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Validator Intelligence</h1>
              <p style={{ margin: "5px 0 0 0", color: "#64748b", fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px" }}>Cross-Chain Consensus Node: ACTIVE</p>
            </div>
            
            <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ padding: "10px 20px", background: "rgba(16, 185, 129, 0.05)", color: "#10b981", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", gap: "8px" }}>
                   <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }}></div>
                   <span style={{ fontSize: "13px", fontWeight: "bold" }}>Awaiting Validation: {landList.filter(l => l.status === "PENDING").length}</span>
                </div>
            </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div className="spinner" style={{ border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #10b981", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "0 auto 20px" }}></div>
                <p style={{ color: "#94a3b8" }}>Syncing assets from oracle...</p>
            </div>
        )}

        {/* LAND GRID */}
        {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "30px" }}>
                {landList.length === 0 && <p style={{ color: "#94a3b8" }}>No assets require verification at this time.</p>}
                
                {landList.map((land) => {
                    const parsedLocation = land.location.startsWith("{") ? JSON.parse(land.location) : { address: land.location };
                    const isPending = land.status === "PENDING";
                    
                    return (
                        <div 
                            key={land.id} 
                            onClick={() => setSelectedLand(land)}
                            style={{ 
                                background: "rgba(15, 23, 42, 0.4)", 
                                borderRadius: "24px", 
                                border: "1px solid rgba(255,255,255,0.08)", 
                                backdropFilter: "blur(20px)",
                                overflow: "hidden",
                                cursor: "pointer",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                position: "relative",
                                display: "flex",
                                flexDirection: "column",
                                transform: "translateY(0)"
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = "translateY(-8px)";
                                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(16, 185, 129, 0.1)";
                                e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            }}
                        >
                            {/* STATUS BADGE */}
                            <div style={{ 
                                position: "absolute", top: "20px", right: "20px", 
                                fontSize: "10px", fontWeight: "900", textTransform: "uppercase", padding: "6px 12px", borderRadius: "100px",
                                background: land.status === "VERIFIED" ? "rgba(16, 185, 129, 0.15)" : land.status === "REJECTED" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: land.status === "VERIFIED" ? "#34d399" : land.status === "REJECTED" ? "#f87171" : "#fbbf24",
                                border: `1px solid ${land.status === "VERIFIED" ? "#10b98144" : land.status === "REJECTED" ? "#ef444444" : "#f59e0b44"}`,
                                letterSpacing: "1px"
                            }}>
                                {land.status}
                            </div>

                            <div style={{ padding: "30px", flexGrow: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                                   <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                   </div>
                                   <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{land.propertyType || "Property"}</span>
                                </div>

                                <h3 style={{ margin: "0 0 10px 0", fontSize: "22px", fontWeight: "800", color: "#f8fafc" }}>{land.title}</h3>
                                <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{parsedLocation.address}</p>

                                <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
                                    <div style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                                        <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Valuation</div>
                                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>₹{(land.price / 100000).toFixed(1)}L</div>
                                    </div>
                                    <div style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                                        <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Total Area</div>
                                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>{land.area} SqFt</div>
                                    </div>
                                </div>

                                {/* CONSENSUS PROGRESS BAR */}
                                <div style={{ marginBottom: "25px" }}>
                                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", fontWeight: "bold" }}>
                                      <span style={{ color: "#94a3b8" }}>CONSENSUS STATUS</span>
                                      <span style={{ color: "#10b981" }}>{land.votes?.length || 0} VOTES CAST</span>
                                   </div>
                                   <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", display: "flex" }}>
                                      <div style={{ width: `${(land.votes?.filter((v:any) => v.vote==="approve").length || 0) * 100 / 3}%`, background: "#10b981", height: "100%" }}></div>
                                      <div style={{ width: `${(land.votes?.filter((v:any) => v.vote==="reject").length || 0) * 100 / 3}%`, background: "#ef4444", height: "100%" }}></div>
                                   </div>
                                </div>
                            </div>
                            
                            <div style={{ padding: "15px 30px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center", fontSize: "12px", color: "#10b981", fontWeight: "bold" }}>
                               VIEW INVESTIGATION DOSSIER →
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        {/* DETAIL MODAL */}
        {selectedLand && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(2, 6, 23, 0.95)", backdropFilter: "blur(15px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <div style={{ background: "#0f172a", width: "100%", maxWidth: "900px", maxHeight: "90vh", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", position: "relative", boxShadow: "0 50px 100px rgba(0,0,0,0.8)" }}>
                    
                    {/* MODAL HEADER */}
                    <div style={{ padding: "40px 40px 20px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                           <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                              <span style={{ padding: "4px 12px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: "100px", fontSize: "11px", fontWeight: "900" }}>{selectedLand.propertyType}</span>
                              <span style={{ padding: "4px 12px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: "100px", fontSize: "11px", fontWeight: "900" }}>ID: #{selectedLand.id.toString().padStart(4, '0')}</span>
                           </div>
                           <h2 style={{ margin: 0, fontSize: "32px", fontWeight: "900" }}>{selectedLand.title}</h2>
                           <p style={{ color: "#94a3b8", margin: "10px 0 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {selectedLand.location?.startsWith("{") ? JSON.parse(selectedLand.location).address : selectedLand.location}
                           </p>
                        </div>
                        <button onClick={() => setSelectedLand(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "white", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                           <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", padding: "0 40px 40px 40px", overflowY: "auto", maxHeight: "calc(90vh - 150px)" }}>
                        
                        {/* LEFT: DETAILS */}
                        <div>
                            <div style={{ marginBottom: "30px" }}>
                                <h4 style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Asset Description</h4>
                                <p style={{ color: "#cbd5e1", lineHeight: "1.8", fontSize: "15px" }}>{selectedLand.description}</p>
                            </div>

                            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "20px", padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>ANNUAL REVENUE</div>
                                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#10b981" }}>₹{selectedLand.annualRevenue?.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>MAINTENANCE</div>
                                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#ef4444" }}>₹{selectedLand.maintenanceCosts?.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>TOKENIZED VALUE</div>
                                    <div style={{ fontSize: "16px", fontWeight: "700" }}>{selectedLand.totalTokens} UNITS</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>AREA MAGNITUDE</div>
                                    <div style={{ fontSize: "16px", fontWeight: "700" }}>{selectedLand.area} SQFT</div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: OWNER & EVIDENCE */}
                        <div>
                            <h4 style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "15px" }}>Verification Subjects</h4>
                            
                            {/* OWNER INFO */}
                            <div style={{ background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div style={{ width: "45px", height: "45px", borderRadius: "12px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "bold" }}>
                                   {selectedLand.owner?.name?.charAt(0)}
                                </div>
                                <div style={{ flexGrow: 1 }}>
                                   <div style={{ fontSize: "14px", fontWeight: "700" }}>{selectedLand.owner?.name}</div>
                                   <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>{selectedLand.owner?.walletAddress}</div>
                                </div>
                                <div style={{ padding: "4px 8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "6px", color: "#10b981", fontSize: "10px", fontWeight: "bold" }}>KYC VERIFIED</div>
                            </div>

                            <h4 style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "15px" }}>Legal Evidence Vault</h4>
                             <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
                                <a 
                                    href={`${API_URL}/validator/land/${selectedLand.id}/view/deed?token=${authToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "16px", color: "white", cursor: "pointer", fontWeight: "bold", textDecoration: "none" }}
                                >
                                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                      <div style={{ width: "32px", height: "32px", background: "#3b82f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>📜</div>
                                      <span>Registered Property Deed</span>
                                   </div>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
 
                                <a 
                                    href={`${API_URL}/validator/land/${selectedLand.id}/view/tax?token=${authToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: "16px", color: "white", cursor: "pointer", fontWeight: "bold", textDecoration: "none" }}
                                >
                                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                      <div style={{ width: "32px", height: "32px", background: "#7c3aed", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>📝</div>
                                      <span>Clearance & Tax Certificates</span>
                                   </div>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>

                            </div>


                            {/* DECISION SYSTEM */}
                            {selectedLand.status === "PENDING" ? (
                                selectedLand.votes?.some((v: any) => v.userId === currentUserId) ? (
                                    <div style={{ padding: "20px", textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                                        <p style={{ margin: 0, color: "#10b981", fontSize: "16px", fontWeight: "900" }}>YOU HAVE ALREADY VOTED</p>
                                        <p style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold", marginTop: "10px" }}>Awaiting other validators to reach consensus.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", gap: "15px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "30px" }}>
                                        <button 
                                            onClick={() => handleVote(selectedLand.id, "approve")}
                                            style={{ flex: 1, padding: "18px", background: "linear-gradient(135deg, #10b981, #059669)", color: "black", fontSize: "14px", fontWeight: "900", border: "none", borderRadius: "16px", cursor: "pointer", boxShadow: "0 10px 20px rgba(16, 185, 129, 0.3)" }}
                                        >
                                            VERIFY ASSET
                                        </button>
                                        <button 
                                            onClick={() => handleVote(selectedLand.id, "reject")}
                                            style={{ flex: 1, padding: "18px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444", fontSize: "14px", fontWeight: "900", borderRadius: "16px", cursor: "pointer" }}
                                        >
                                            FLAG FRAUD
                                        </button>
                                    </div>
                                )
                            ) : (
                                <div style={{ padding: "20px", textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                                    <p style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}>This asset session is CLOSED.</p>
                                    <p style={{ margin: 0, color: selectedLand.status === "VERIFIED" ? "#10b981" : "#ef4444", fontSize: "20px", fontWeight: "900" }}>{selectedLand.status} ON-CHAIN</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <style jsx global>{`
           @keyframes spin {
             from { transform: rotate(0deg); }
             to { transform: rotate(360deg); }
           }
        `}</style>
      </div>
    </AuthGuard>
  );
}
