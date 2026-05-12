"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useDisconnect, useConnect } from "wagmi";


import { ADDRESSES, RWATokenABI } from "../lib/contracts/abi";
import { formatUnits } from "viem";
import { API_URL } from "../lib/api";

export default function Navbar() {
  const router = useRouter();
  const { logout: privyLogout, login, authenticated, connectWallet } = usePrivy();

  const { disconnect } = useDisconnect();
  const { connectors, connect } = useConnect();
  const [mounted, setMounted] = useState(false);


  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("U");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  const [kycStatus, setKycStatus] = useState<string>("NOT_SUBMITTED");
  const { address } = useAccount();
 
  // 1. RWAToken Balance + Decimals
  const { data: rwaBalanceData } = useReadContract({
    address: ADDRESSES.RWAToken as `0x${string}`,
    abi: RWATokenABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: 80002,
    query: { enabled: !!address, refetchInterval: 10000 }
  });
 
  const { data: rwaDecimals } = useReadContract({
    address: ADDRESSES.RWAToken as `0x${string}`,
    abi: RWATokenABI,
    functionName: 'decimals',
    chainId: 80002,
    query: { enabled: !!address }
  });
 
  const rwaBalance = mounted && rwaBalanceData !== undefined ? parseFloat(formatUnits(rwaBalanceData as bigint, Number(rwaDecimals || 18))).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";

  const pathname = usePathname();

  const logout = async () => {
    // 🔐 Forcibly disconnect the crypto wallet
    try {
      await privyLogout();
    } catch (e) {
      console.error("Wallet disconnect error", e);
    }

    // 🧤 Clear session
    localStorage.clear();
    setToken(null);
    setUserName("U");
    setKycStatus("NOT_SUBMITTED");
    setDropdownOpen(false);
    router.push("/");
  };

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);

    if (storedToken) {
      // Refresh user data from backend with error persistence
      const refreshUserData = async () => {
        try {
          const res = await fetch(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });

          if (res.status === 401) {
            logout();
            return;
          }

          if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
              localStorage.setItem("user", JSON.stringify(data.user));
              setUserName(data.user.name.charAt(0).toUpperCase());
              setKycStatus(data.user.kycStatus || "NOT_SUBMITTED");
            }
          }
        } catch (e) {
          // Gracefully handle connection failures (e.g. backend down)
          console.warn("[Navbar] Backend unreachable, using cached session.");
          
          // Attempt to restore from cache if not already done
          const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
          if (cachedUser.name) setUserName(cachedUser.name.charAt(0).toUpperCase());
          if (cachedUser.kycStatus) setKycStatus(cachedUser.kycStatus);
        }
      };

      refreshUserData();
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.name) setUserName(user.name.charAt(0).toUpperCase());
      if (user?.kycStatus) setKycStatus(user.kycStatus);
    } catch (e) {
      console.error("Failed to parse user from local storage");
    }
  }, [pathname]);

  if (!mounted) return null;

  return (
    <div className="navbar" style={{ padding: "0 20px", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, zIndex: 100 }}>
      <div className="nav-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1200px", margin: "0 auto", height: "70px" }}>

        {/* LEFT: LOGO */}
        <h2 className="logo" onClick={() => router.push("/")} style={{ cursor: "pointer", background: "linear-gradient(90deg, #7c3aed, #4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "28px", fontWeight: "900", letterSpacing: "1px" }}>
          RWA
        </h2>

        {/* CENTER: NAVIGATION */}
        {(token || authenticated) && (
          <div className="nav-center" style={{ display: "flex", gap: "25px", fontWeight: "500", alignItems: "center", color: "#e2e8f0" }}>
            <span style={{ cursor: "pointer", transition: "color 0.2s" }} onClick={() => router.push("/dashboard")} onMouseOver={(e) => e.currentTarget.style.color = "#4ade80"} onMouseOut={(e) => e.currentTarget.style.color = "#e2e8f0"}>Dashboard</span>
            
            {/* Show Consumer Links ONLY for non-validators and non-admins */}
            {mounted && !["VALIDATOR", "ADMIN"].includes(JSON.parse(localStorage.getItem("user") || "{}").role) && (
              <>
                <span style={{ cursor: "pointer", transition: "color 0.2s" }} onClick={() => router.push("/buy")} onMouseOver={(e) => e.currentTarget.style.color = "#4ade80"} onMouseOut={(e) => e.currentTarget.style.color = "#e2e8f0"}>Buy Land</span>
                <span style={{ cursor: "pointer", transition: "color 0.2s" }} onClick={() => router.push("/sell")} onMouseOver={(e) => e.currentTarget.style.color = "#4ade80"} onMouseOut={(e) => e.currentTarget.style.color = "#e2e8f0"}>Sell Land</span>
                <span style={{ cursor: "pointer", transition: "color 0.2s", color: "#4ade80", fontWeight: "bold" }} onClick={() => router.push("/kyc")} onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.2)"} onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}>Verify Identity</span>
              </>
            )}

            {/* Admin Portal */}
            {mounted && JSON.parse(localStorage.getItem("user") || "{}").role?.toUpperCase() === "ADMIN" && (
               <span style={{ cursor: "pointer", color: "#c084fc", fontWeight: "bold" }} onClick={() => router.push("/admin")}>⚡ Auditor Portal</span>
            )}

            {/* Validator Oracle (PRIMARY for Validators) */}
            {mounted && (JSON.parse(localStorage.getItem("user") || "{}").role === "VALIDATOR" || JSON.parse(localStorage.getItem("user") || "{}").role === "ADMIN") && (
               <span style={{ cursor: "pointer", color: "#10b981", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px" }} onClick={() => router.push("/validator")}>🛡️ Validator Oracle</span>
            )}

          </div>
        )}

        {/* RIGHT: AUTH & WALLET */}
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {(token || authenticated) ? (
            <>
              {/* On-Chain Balance Display */}
              <div style={{ padding: "8px 15px", background: "rgba(74, 222, 128, 0.1)", border: "1px solid rgba(74, 222, 128, 0.2)", borderRadius: "10px", fontSize: "12px", fontWeight: "bold", color: "#4ade80", display: "flex", gap: "5px" }}>
                  <span>{rwaBalance}</span>
                  <span style={{ color: "#94a3b8", fontSize: "10px" }}>RWA</span>
              </div>
 
              {/* Wallet Connect */}
              {!authenticated && !address ? (
                <button 
                  onClick={() => {
                    // 🛡️ Use Privy's official modal to avoid wallet conflicts
                    connectWallet();
                  }}



                  style={{ padding: "8px 15px", background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: "10px", fontSize: "12px", fontWeight: "bold", color: "#a78bfa", cursor: "pointer" }}
                >
                  Connect Wallet
                </button>
              ) : (

                <div style={{ position: "relative" }}>

                  <div 
                    onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                    style={{ 
                      padding: "8px 15px", 
                      background: mounted && address && JSON.parse(localStorage.getItem("user") || "{}").walletAddress && address.toLowerCase() !== JSON.parse(localStorage.getItem("user") || "{}").walletAddress?.toLowerCase() && !["ADMIN", "VALIDATOR"].includes(JSON.parse(localStorage.getItem("user") || "{}").role) ? "rgba(245, 158, 11, 0.1)" : "rgba(124, 58, 237, 0.1)", 
                      border: mounted && address && JSON.parse(localStorage.getItem("user") || "{}").walletAddress && address.toLowerCase() !== JSON.parse(localStorage.getItem("user") || "{}").walletAddress?.toLowerCase() && !["ADMIN", "VALIDATOR"].includes(JSON.parse(localStorage.getItem("user") || "{}").role) ? "1px solid #f59e0b" : "1px solid rgba(124, 58, 237, 0.2)", 
                      borderRadius: "10px", 
                      fontSize: "12px", 
                      fontWeight: "bold", 
                      color: mounted && address && JSON.parse(localStorage.getItem("user") || "{}").walletAddress && address.toLowerCase() !== JSON.parse(localStorage.getItem("user") || "{}").walletAddress?.toLowerCase() && !["ADMIN", "VALIDATOR"].includes(JSON.parse(localStorage.getItem("user") || "{}").role) ? "#f59e0b" : "#a78bfa",


                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer"
                    }}
                  >
                    {address ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}></div>
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.6 }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#64748b" }}></div>
                        {mounted && JSON.parse(localStorage.getItem("user") || "{}").walletAddress ? `${JSON.parse(localStorage.getItem("user") || "{}").walletAddress.slice(0, 6)}...${JSON.parse(localStorage.getItem("user") || "{}").walletAddress.slice(-4)}` : "Disconnected"}
                      </div>

                    )}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>

                  {walletDropdownOpen && (
                    <div style={{ position: "absolute", top: "45px", right: "0", background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "5px", width: "160px", zIndex: 1000, backdropFilter: "blur(10px)" }}>
                      {!address ? (
                        <button 
                          onClick={() => { 
                            // 🔍 Look for any connector that belongs to Privy
                            const privyConnector = connectors.find(c => c.id.toLowerCase().includes('privy'));
                            if (privyConnector) {
                              connect({ connector: privyConnector });
                            } else if (connectors.length > 0) {
                              // If privy ID isn't found, try the first available non-injected connector
                              const altConnector = connectors.find(c => c.id !== 'injected') || connectors[0];
                              connect({ connector: altConnector });
                            } else {
                              login(); // 🛡️ Final fallback
                            }
                            setWalletDropdownOpen(false); 
                          }}


                          style={{ width: "100%", padding: "8px", background: "rgba(124, 58, 237, 0.1)", color: "#a78bfa", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "5px", fontSize: "12px", fontWeight: "bold" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(124, 58, 237, 0.2)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "rgba(124, 58, 237, 0.1)"}
                        >
                          🔌 Connect Wallet
                        </button>
                      ) : (
                        <button 
                          onClick={() => { disconnect(); setWalletDropdownOpen(false); }}
                          style={{ width: "100%", padding: "8px", background: "transparent", color: "#fca5a5", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "5px", fontSize: "12px", fontWeight: "bold" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          🔴 Disconnect Wallet
                        </button>
                      )}
                    </div>
                  )}

                </div>
              )}




              {/* Profile Dropdown */}
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", fontWeight: "bold", boxShadow: "0 0 10px rgba(124, 58, 237, 0.5)", position: "relative" }}
                >
                  {userName}
                  
                  {/* ✅ Verification Tick Mark Badge (Shown for Verified users, Validators, and Admins) */}
                  {mounted && (kycStatus === "VERIFIED" || kycStatus === "APPROVED" || JSON.parse(localStorage.getItem("user") || "{}").role === "VALIDATOR" || JSON.parse(localStorage.getItem("user") || "{}").role === "ADMIN") && (
                    <div style={{ position: "absolute", bottom: "-2px", right: "-2px", background: "#22c55e", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0f172a", boxShadow: "0 2px 5px rgba(0,0,0,0.5)" }}>

                      <svg viewBox="0 0 24 24" width="10" height="10" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>

                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "50px", right: "0", background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", width: "160px", display: "flex", flexDirection: "column", gap: "8px", backdropFilter: "blur(15px)", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                    <button onClick={() => { setDropdownOpen(false); router.push("/profile"); }} style={{ padding: "8px", background: "transparent", color: "white", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "5px" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>My Profile</button>
                    <button onClick={() => { setDropdownOpen(false); router.push("/settings"); }} style={{ padding: "8px", background: "transparent", color: "white", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "5px" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>Settings</button>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "4px 0" }}></div>
                    <button onClick={logout} style={{ padding: "8px", background: "transparent", color: "#ef4444", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "5px", fontWeight: "bold" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                className="nav-btn"
                onClick={() => router.push("/login")}
                style={{ padding: "8px 20px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", background: "transparent", color: "white", cursor: "pointer" }}
              >
                Login
              </button>

              <button
                className="nav-btn primary"
                onClick={() => router.push("/signup")}
                style={{ padding: "8px 20px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #22c55e, #4ade80)", color: "black", fontWeight: "bold", cursor: "pointer", boxShadow: "0 0 10px rgba(34, 197, 94, 0.3)" }}
              >
                Signup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}