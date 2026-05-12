"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useConfig } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";
import { ADDRESSES, LandVerifierABI } from "@/src/lib/contracts/abi";

export default function GovernancePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [validatorAddress, setValidatorAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [totalValidators, setTotalValidators] = useState(0);
  const [owner, setOwner] = useState("");

  const { address, isConnected } = useAccount();
  const config = useConfig();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role === "ADMIN") {
      setIsAdmin(true);
      fetchStats();
    } else {
      window.location.href = "/dashboard";
    }
  }, []);

  const fetchStats = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
      const contract = new ethers.Contract(ADDRESSES.LandVerifier, LandVerifierABI, provider);
      
      const count = await contract.totalValidators();
      const ownerAddr = await contract.owner();
      
      setTotalValidators(Number(count));
      setOwner(ownerAddr);
    } catch (e) {
      console.error("Fetch failed", e);
    }
  };

  const handleAddValidator = async () => {
    if (!validatorAddress || !ethers.isAddress(validatorAddress)) {
      alert("Please enter a valid wallet address");
      return;
    }

    setSubmitting(true);
    try {
      const client = await getConnectorClient(config);
      const provider = new ethers.BrowserProvider(client.transport as any);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(ADDRESSES.LandVerifier, LandVerifierABI, signer);
      
      console.log("Adding Validator:", validatorAddress);
      const tx = await contract.addValidator(validatorAddress);
      alert("Transaction Sent! Waiting for confirmation...");
      await tx.wait();
      
      alert("Validator Added Successfully! ✅");
      setValidatorAddress("");
      fetchStats();
    } catch (e: any) {
      alert("Error: " + (e.reason || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <AuthGuard>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "40px", maxWidth: "1200px", margin: "0 auto", color: "white", minHeight: "100vh" }}>
        
        {/* 🏛️ HEADER 🏛️ */}
        <div style={{ marginBottom: "50px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "30px" }}>
          <h1 style={{ fontSize: "42px", fontWeight: "900", margin: 0, background: "linear-gradient(to right, #10b981, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Protocol Governance</h1>
          <p style={{ color: "#94a3b8", marginTop: "10px", fontSize: "16px" }}>Manage Decentralized Validator Oracle & Smart Contract Parameters</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
          
          {/* STATS CARD */}
          <div style={{ background: "rgba(15, 23, 42, 0.4)", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
            <h3 style={{ margin: "0 0 30px 0", fontSize: "20px", color: "#10b981" }}>Network Statistics</h3>
            
            <div style={{ marginBottom: "25px" }}>
              <span style={{ display: "block", color: "#64748b", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px" }}>Current Owner (Admin)</span>
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", fontFamily: "monospace" }}>{owner}</span>
            </div>

            <div style={{ marginBottom: "25px" }}>
              <span style={{ display: "block", color: "#64748b", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px" }}>Total Active Validators</span>
              <span style={{ fontSize: "48px", fontWeight: "900", color: "#10b981" }}>{totalValidators}</span>
            </div>

            <div style={{ padding: "15px", background: "rgba(16, 185, 129, 0.05)", borderRadius: "12px", border: "1px dashed rgba(16, 185, 129, 0.3)" }}>
               <p style={{ margin: 0, fontSize: "13px", color: "#6ee7b7" }}>🛡️ Consensus Rule: <b>{Math.floor(totalValidators / 2) + 1} votes</b> required for property verification.</p>
            </div>
          </div>

          {/* ACTION CARD */}
          <div style={{ background: "rgba(15, 23, 42, 0.4)", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
            <h3 style={{ margin: "0 0 30px 0", fontSize: "20px", color: "#3b82f6" }}>Add New Validator</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "25px" }}>Register a new trusted wallet address to participate in property verification votes.</p>
            
            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", marginBottom: "10px", color: "#fff", fontWeight: "600" }}>Wallet Address</label>
              <input 
                type="text" 
                placeholder="0x..." 
                value={validatorAddress}
                onChange={(e) => setValidatorAddress(e.target.value)}
                style={{ width: "100%", padding: "15px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "14px" }}
              />
            </div>

            <button 
              onClick={handleAddValidator}
              disabled={submitting}
              style={{ 
                width: "100%", 
                padding: "16px", 
                borderRadius: "12px", 
                background: submitting ? "#64748b" : "linear-gradient(135deg, #3b82f6, #2563eb)", 
                color: "white", 
                border: "none", 
                fontWeight: "bold", 
                fontSize: "16px", 
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 10px 20px rgba(59, 130, 246, 0.2)"
              }}
            >
              {submitting ? "⏳ Broadcasting to Network..." : "➕ Add Validator on Polygon"}
            </button>
          </div>

        </div>

      </div>
    </AuthGuard>
  );
}
