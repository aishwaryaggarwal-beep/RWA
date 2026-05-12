"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";

export default function AdminPage() {
  const [kycList, setKycList] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role === "ADMIN") {
      setIsAdmin(true);
    } else {
      window.location.href = "/dashboard";
      return;
    }

    fetch(`${API_URL}/admin/kyc`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then((res) => res.json()).then((data) => Array.isArray(data) ? setKycList(data) : setKycList([]));
    
  }, []);

  if (!isAdmin) return null;

  return (
    <AuthGuard>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "40px", maxWidth: "1400px", margin: "0 auto", color: "white", minHeight: "100vh" }}>
        
        {/* ⚡ HEADER: AUDITOR COMMAND CENTER ⚡ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "50px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "25px" }}>
            <div>
              <h1 style={{ margin: 0, fontWeight: "900", fontSize: "36px", background: "linear-gradient(to right, #c084fc, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Identity Auditor Portal</h1>
              <p style={{ margin: "5px 0 0 0", color: "#64748b", fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px" }}>Forensic Intelligence Layer: ACTIVE</p>
            </div>
            
            <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ padding: "10px 20px", background: "rgba(192, 132, 252, 0.05)", color: "#c084fc", borderRadius: "12px", border: "1px solid rgba(192, 132, 252, 0.2)", display: "flex", alignItems: "center", gap: "8px" }}>
                   <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c084fc", boxShadow: "0 0 10px #c084fc" }}></div>
                   <span style={{ fontSize: "13px", fontWeight: "bold" }}>Pending Analysis: {kycList.filter(k => k.status === "PENDING").length}</span>
                </div>
                <div style={{ padding: "10px 20px", background: "rgba(255, 255, 255, 0.03)", color: "#94a3b8", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
                   <span style={{ fontSize: "13px", fontWeight: "bold" }}>Total Verified: {kycList.filter(k => k.status === "VERIFIED").length}</span>
                </div>
            </div>
        </div>

        {/* 🕵️ APPLICANT QUEUE 🕵️ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "25px" }}>
            {kycList.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: "30px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ color: "#64748b", fontSize: "18px" }}>Intelligence queue is empty. No applicants currently require forensic review.</p>
              </div>
            )}

            {kycList.map((kyc) => {
              const riskLevel = kyc.riskScore < 20 ? "LOW" : kyc.riskScore < 60 ? "MEDIUM" : "HIGH";
              const riskColor = riskLevel === "LOW" ? "#22c55e" : riskLevel === "MEDIUM" ? "#f59e0b" : "#ef4444";
              const initials = (kyc.firstName?.charAt(0) || "") + (kyc.lastName?.charAt(0) || "");

              return (
                <div 
                  key={kyc.id} 
                  style={{ 
                    background: "rgba(15, 23, 42, 0.4)", 
                    borderRadius: "24px", 
                    padding: "30px", 
                    border: "1px solid rgba(255,255,255,0.05)", 
                    backdropFilter: "blur(20px)",
                    position: "relative",
                    transition: "all 0.3s ease",
                    cursor: "pointer"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.borderColor = "rgba(192, 132, 252, 0.3)";
                    e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => (window.location.href = `/admin/${kyc.userId}`)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "25px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: `linear-gradient(135deg, ${riskColor}44, ${riskColor}11)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: riskColor, fontSize: "18px", border: `1px solid ${riskColor}33` }}>
                      {initials}
                    </div>
                    <span style={{ 
                      fontSize: "10px", 
                      fontWeight: "900", 
                      padding: "6px 12px", 
                      borderRadius: "100px", 
                      background: kyc.status === "VERIFIED" ? "rgba(34, 197, 94, 0.1)" : kyc.status === "REJECTED" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                      color: kyc.status === "VERIFIED" ? "#22c55e" : kyc.status === "REJECTED" ? "#ef4444" : "#f59e0b",
                      border: `1px solid ${kyc.status === "VERIFIED" ? "#22c55e44" : kyc.status === "REJECTED" ? "#ef444444" : "#f59e0b44"}`,
                      letterSpacing: "1px"
                    }}>
                      {kyc.status}
                    </span>
                  </div>

                  <h3 style={{ margin: "0 0 5px 0", fontSize: "20px", fontWeight: "800" }}>{kyc.firstName} {kyc.lastName}</h3>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: "600" }}>{kyc.user?.email || "EXTERNAL_APPLICANT"}</p>

                  <div style={{ marginTop: "30px", padding: "20px", borderRadius: "16px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "900", color: "#64748b", letterSpacing: "1px" }}>IDENTITY RISK SCORE</span>
                      <span style={{ fontSize: "15px", fontWeight: "900", color: riskColor }}>{kyc.riskScore}%</span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ width: `${kyc.riskScore}%`, background: riskColor, height: "100%", boxShadow: `0 0 10px ${riskColor}` }}></div>
                    </div>
                  </div>

                  <div style={{ marginTop: "25px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      Applied: {new Date(kyc.createdAt).toLocaleDateString()}
                    </div>
                    <button style={{ background: "none", border: "none", color: "#c084fc", fontSize: "13px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                      Review Identity →
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </AuthGuard>

  );
}