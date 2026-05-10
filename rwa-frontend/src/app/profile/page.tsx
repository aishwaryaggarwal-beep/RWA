"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import { API_URL } from "@/src/lib/api";
import { useAccount } from "wagmi";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Fallback to local storage
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          if (stored.id) setUser(stored);
        }
      } catch (err) {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        if (stored.id) setUser(stored);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "white" }}>
          Loading profile...
        </div>
      </AuthGuard>
    );
  }

  if (!user) {
    return (
      <AuthGuard>
        <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
          Failed to load profile data.
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
        
        <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
          My Account Profile
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" }}>
          
          {/* Left Column: Personal Card */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", padding: "30px", height: "fit-content" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ 
                width: "100px", 
                height: "100px", 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, #7c3aed, #4ade80)", 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                fontSize: "40px", 
                fontWeight: "bold",
                color: "white",
                boxShadow: "0 10px 25px rgba(124, 58, 237, 0.4)",
                marginBottom: "20px"
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: "0 0 5px 0", fontSize: "24px", fontWeight: "bold" }}>{user.name}</h2>
              <p style={{ color: "#94a3b8", margin: "0 0 20px 0", fontSize: "14px" }}>{user.email}</p>
              
              <div style={{ 
                background: user.role === "ADMIN" ? "rgba(192, 132, 252, 0.1)" : user.role === "VALIDATOR" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)", 
                color: user.role === "ADMIN" ? "#c084fc" : user.role === "VALIDATOR" ? "#10b981" : "#3b82f6", 
                padding: "6px 16px", 
                borderRadius: "20px", 
                fontSize: "12px", 
                fontWeight: "900",
                letterSpacing: "1px"
              }}>
                {user.role} ACCOUNT
              </div>
            </div>

            <div style={{ marginTop: "40px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
              <p style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", marginBottom: "15px" }}>Verification Status</p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {user.kycStatus === "APPROVED" || user.kycStatus === "VERIFIED" ? (
                  <>
                    <div style={{ width: "12px", height: "12px", background: "#4ade80", borderRadius: "50%" }}></div>
                    <span style={{ color: "white", fontWeight: "500" }}>Identity Verified</span>
                  </>
                ) : user.kycStatus === "PENDING" ? (
                  <>
                    <div style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "50%" }}></div>
                    <span style={{ color: "white", fontWeight: "500" }}>Pending Review</span>
                  </>
                ) : (
                  <>
                    <div style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "50%" }}></div>
                    <span style={{ color: "white", fontWeight: "500" }}>Unverified</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Security & Preferences */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", padding: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 20px 0", color: "white" }}>Identity & Contact</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "10px" }}>
                <div>
                  <p style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", margin: "0 0 5px 0" }}>Full Legal Name</p>
                  <p style={{ color: "white", margin: 0, fontSize: "15px" }}>{user.name}</p>
                </div>
                <div>
                  <p style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", margin: "0 0 5px 0" }}>Primary Email</p>
                  <p style={{ color: "white", margin: 0, fontSize: "15px" }}>{user.email}</p>
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", padding: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 20px 0", color: "white" }}>Web3 Integration</h3>
              
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", margin: "0 0 8px 0" }}>Registered Wallet Address</p>
                {user.walletAddress ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "15px", margin: 0, wordBreak: "break-all" }}>
                      {user.walletAddress}
                    </p>
                    {address && address.toLowerCase() !== user.walletAddress.toLowerCase() && (
                      <span style={{ fontSize: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "4px 8px", borderRadius: "8px", whiteSpace: "nowrap" }}>Wallet Mismatch</span>
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#ef4444", margin: 0, fontSize: "14px", fontWeight: "500" }}>No wallet linked. Please link your wallet from the Dashboard.</p>
                )}
              </div>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", padding: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 10px 0", color: "white" }}>Account Actions</h3>
              <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px" }}>Manage your account security and preferences here.</p>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{ padding: "10px 20px", background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>Change Password</button>
                <button style={{ padding: "10px 20px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "10px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>Delete Account</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
