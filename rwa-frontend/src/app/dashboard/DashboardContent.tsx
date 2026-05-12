"use client";
import { useEffect, useState, useMemo } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSignMessage, useSwitchChain, useReadContract, useBalance, usePublicClient, useConnect, useDisconnect } from "wagmi";



import { ADDRESSES, RWATokenABI, LandTokenABI } from "@/src/lib/contracts/abi";
import { formatUnits } from "viem";
import { API_URL } from "@/src/lib/api";

export default function DashboardContent() {
  const [user, setUser] = useState<any>({});
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [allLands, setAllLands] = useState<any[]>([]);
  const [myLands, setMyLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { login } = usePrivy();

  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const { address, isConnected, chainId, connector } = useAccount();
  
  const switchWallet = async () => {
    // 1. Kill the current (wrong) connection
    disconnect();
    
    // 2. Wait a bit then try to connect Privy
    setTimeout(() => {
      const privyConnector = connectors.find((c) => c.id === "privy");
      if (privyConnector) {
        connect({ connector: privyConnector });
      } else {
        login();
      }
    }, 500);
  };



  const { signMessageAsync } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();

  const [portfolioStats, setPortfolioStats] = useState({ totalValue: 0, assetCount: 0 });
  const [ownedLandsData, setOwnedLandsData] = useState<any[]>([]);
  const [favoriteLands, setFavoriteLands] = useState<number[]>([]);

  // 1. RWAToken Balance + Decimals (Reactive with Polling)
  const { data: rwaBalanceData } = useReadContract({
    address: ADDRESSES.RWAToken as `0x${string}`,
    abi: RWATokenABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: 80002,
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  const { data: rwaDecimals } = useReadContract({
    address: ADDRESSES.RWAToken as `0x${string}`,
    abi: RWATokenABI,
    functionName: 'decimals',
    chainId: 80002,
    query: { enabled: !!address }
  });

  const rwaBalance = useMemo(() => {
    if (rwaBalanceData === undefined) return "0";
    const dec = rwaDecimals !== undefined ? Number(rwaDecimals) : 18;
    const formatted = formatUnits(rwaBalanceData as bigint, dec);
    // Return formatted string with fixed 2 decimals for cleaner UI
    return parseFloat(formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [rwaBalanceData, rwaDecimals]);

  const toggleFavorite = (id: number) => {
    setFavoriteLands(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // 1. Fetch Fresh User Data
        if (token) {
          try {
            const resMe = await fetch(`${API_URL}/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resMe.ok) {
              const meData = await resMe.json();
              localStorage.setItem("user", JSON.stringify(meData.user));
              setUser(meData.user);
              setKycStatus(meData.user?.kycStatus || null);
            } else {
              // If unauthorized, redirect to login
              if (resMe.status === 401) window.location.href = "/login";
            }
          } catch (e) { console.error("Me fetch failed", e); }
        } else {
          // Fallback to local storage if no token (shouldn't happen with AuthGuard)
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          setUser(storedUser);
          setKycStatus(storedUser?.kycStatus || null);
        }

        // 2. Fetch Lands
        try {
          const resAll = await fetch(`${API_URL}/land/all`);
          const landsData = await resAll.json();
          if (resAll.ok) setAllLands(landsData);

          if (token) {
            const resMy = await fetch(`${API_URL}/land/my`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resMy.ok) setMyLands(await resMy.json());
          }
        } catch (e) { console.log("Lands fetch failed", e); }
      } catch (e) { console.error("Init failed", e); } finally { setLoading(false); }
    };

    initDashboard();
  }, []);


  // 2. Scan for LandToken holdings (manual loop but reactive to address/list)
  useEffect(() => {
    if (!address || (allLands.length === 0 && myLands.length === 0) || !isConnected) return;

    const scanHoldings = async () => {
      console.log("[Blockchain] Scanning holdings for:", address);
      try {
        if (!publicClient || !address) return;

        let totalVal = 0;
        let ownedCount = 0;
        const owned: any[] = [];

        // Use a batch of parallel calls for better performance
        // Combined scan: Marketplace + My Own Listings (to track minted but unlisted)
        const uniqueLandIds = new Set();
        const scanList = [...allLands, ...myLands].filter(land => {
          if (uniqueLandIds.has(land.id)) return false;
          uniqueLandIds.add(land.id);
          return true;
        });

        const balancePromises = scanList.map(async (land) => {
          try {
            const tokenId = BigInt(land.onChainId || land.id);
            const bal = await publicClient.readContract({
              address: ADDRESSES.LandToken as `0x${string}`,
              abi: LandTokenABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`, tokenId],
            }) as bigint;

            if (bal > 0n) {
              const unitPrice = (land.price / (land.totalTokens || 1000));
              const value = Number(bal) * unitPrice;
              
              // Only add to 'owned' (for the Portfolio list display) if it's NOT our own listing
              // This keeps the 'Portfolio Assets' list clean, but we use the value for the overall 'Wealth' stat
              if (land.ownerId !== user.id) {
                owned.push({ ...land, userBalance: Number(bal), value });
              }
              
              return { owned: true, value };
            }
          } catch (innerE) {
            console.warn(`[Blockchain] Asset scan skipped for ID ${land.id}`);
          }
          return { owned: false, value: 0 };
        });

        const results = await Promise.all(balancePromises);
        results.forEach(res => {
          if (res.owned) {
              totalVal += res.value;
              ownedCount++;
          }
        });

        setOwnedLandsData(owned);
        setPortfolioStats({ totalValue: totalVal, assetCount: ownedCount });
        console.log("[Blockchain] Scan complete. Total Assets:", ownedCount, "Value:", totalVal);
      } catch (e) {
        console.error("Critical Scanner Error:", e);
      }
    };

    scanHoldings();
    const interval = setInterval(scanHoldings, 15000); // Periodic refresh
    return () => clearInterval(interval);
  }, [address, allLands, myLands, isConnected, chainId, publicClient]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Ensure correct chain
  useEffect(() => {
    if (isConnected && chainId !== 80002) {
      switchChain({ chainId: 80002 });
    }
  }, [chainId, isConnected, switchChain]);

  const [showBanner, setShowBanner] = useState(true);

  if (!mounted) return null;

  return (
    <AuthGuard>
      <div className="dashboard-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>

        {/* KYC Banner */}
        {showBanner && user?.role !== "VALIDATOR" && user?.role !== "ADMIN" && kycStatus && kycStatus !== "APPROVED" && kycStatus !== "VERIFIED" && (
          <div style={{ background: kycStatus === "PENDING" ? "rgba(59, 130, 246, 0.1)" : kycStatus === "REJECTED" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)", border: kycStatus === "PENDING" ? "1px solid #3b82f6" : kycStatus === "REJECTED" ? "1px solid #ef4444" : "1px solid #f59e0b", padding: "16px 20px", borderRadius: "12px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ color: kycStatus === "PENDING" ? "#93c5fd" : kycStatus === "REJECTED" ? "#fca5a5" : "#fcd34d", fontWeight: "bold" }}>
                {kycStatus === "PENDING" ? "⏳ Your KYC is being reviewed by platform auditors." : kycStatus === "REJECTED" ? "❌ Identity Rejected: Forensic check detected documentation error." : "⚠️ Account Restricted: Complete KYC to start investing."}
              </span>
            </div>
            <button onClick={() => setShowBanner(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Header */}
        <h1 style={{ fontSize: "36px", fontWeight: "800", marginBottom: "5px", display: "flex", alignItems: "center", gap: "10px" }}>
          Welcome back, {user?.name || "Investor"}
          {(kycStatus === "VERIFIED" || kycStatus === "APPROVED" || user?.role === "VALIDATOR" || user?.role === "ADMIN") && (
            <span style={{ background: "#22c55e", borderRadius: "50%", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="white" strokeWidth="4" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          )}
        </h1>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "40px", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "10px" }}>
          Registered Wallet: 
          {user?.walletAddress ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#7c3aed", fontWeight: "bold" }}>{user.walletAddress}</span>
              <a 
                href={`https://amoy.polygonscan.com/address/${user.walletAddress}#tokentxnsErc1155`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px",
                  background: "rgba(124, 58, 237, 0.1)", 
                  color: "#a78bfa", 
                  padding: "4px 8px", 
                  borderRadius: "6px", 
                  fontSize: "10px", 
                  textDecoration: "none",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(124, 58, 237, 0.2)"}
                onMouseOut={(e) => e.currentTarget.style.background = "rgba(124, 58, 237, 0.1)"}
                title="View your ERC-1155 property tokens natively on the blockchain explorer"
              >
                🔍 View on Polygonscan
              </a>
            </div>
          ) : (
            <span style={{ color: "#ef4444", fontWeight: "bold" }}>N/A</span>
          )}
          


          {!user?.walletAddress && isConnected && (
            <button
              disabled={submitting}
              onClick={async () => {
                try {
                  setSubmitting(true);
                  console.log("[WalletLink] Starting link for:", address);
                  const message = `Link this wallet to my RWA account: ${address}`;
                  const signature = await signMessageAsync({ message });
                  
                  const token = localStorage.getItem("token");
                  const res = await fetch(`${API_URL}/connect-wallet`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ walletAddress: address, signature, message })
                  });
                  
                  if (res.ok) {
                    const data = await res.json();
                    console.log("[WalletLink] Success:", data);
                    const updatedUser = { ...user, walletAddress: address };
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                    setUser(updatedUser);
                    alert("Wallet Linked Successfully! ✅");
                  } else {
                    const err = await res.json();
                    throw new Error(err.message || "Link failed");
                  }
                } catch (e: any) {
                  console.error("[WalletLink] Error:", e);
                  alert("Link failed: " + e.message);
                } finally {
                  setSubmitting(false);
                }
              }}
              style={{ padding: "6px 16px", borderRadius: "8px", background: submitting ? "rgba(100,116,139,0.2)" : "rgba(124, 58, 237, 0.2)", border: "1px solid #7c3aed", color: "#a78bfa", fontSize: "13px", cursor: submitting ? "not-allowed" : "pointer", fontWeight: "bold", transition: "all 0.2s" }}
            >
              {submitting ? "⏳ Linking..." : "🔗 Link Current Wallet"}
            </button>
          )}
          

        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px", marginBottom: "60px" }}>
          <div style={{ padding: "25px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124, 58, 237, 0.3)" }}>
            <p style={{ color: "#a78bfa", fontSize: "14px", fontWeight: "600" }}>Total Asset Value (RWA)</p>
            <h2 style={{ fontSize: "32px", fontWeight: "800" }}>{portfolioStats.totalValue.toLocaleString()} <span style={{ fontSize: "14px", color: "#6b7280" }}>RWA</span></h2>
            <div style={{ marginTop: "10px", padding: "4px 10px", background: "rgba(167, 139, 250, 0.1)", borderRadius: "8px", border: "1px dashed rgba(167, 139, 250, 0.3)", display: "inline-block" }}>
                <span style={{ fontSize: "11px", color: "#a78bfa", fontWeight: "bold" }}>Verified On-Chain 🛡️</span>
            </div>
          </div>
          <div style={{ padding: "25px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "20px" }}>
            <p style={{ color: "#9ca3af", fontSize: "14px", fontWeight: "600" }}>Total Assets Tracked</p>
            <h2 style={{ fontSize: "32px", fontWeight: "800" }}>{portfolioStats.assetCount} <span style={{ fontSize: "16px", color: "#6b7280" }}>Properties</span></h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>Combined Listings & Portfolio</p>
          </div>
          <div style={{ padding: "25px", borderRadius: "16px", background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <p style={{ color: "#6ee7b7", fontSize: "14px", fontWeight: "600", margin: 0 }}>RWA Funds Balance</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", animation: "pulse 2s infinite" }}></div>
                  <span style={{ fontSize: "10px", color: "rgba(74, 222, 128, 0.6)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>On-Chain</span>
                </div>
              </div>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#4ade80", margin: 0 }}>
                {rwaBalanceData === undefined ? "---" : rwaBalance} <span style={{ fontSize: "14px" }}>RWA</span>
              </h2>
              
              <div 
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", cursor: "pointer" }}
                title="Copy RWA Token Address"
                onClick={() => { navigator.clipboard.writeText(ADDRESSES.RWAToken); alert("Token Address Copied!"); }}
              >
                <span style={{ fontSize: "11px", color: "#6ee7b7", opacity: 0.8 }}>Contract:</span>
                <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace", textDecoration: "underline" }}>{ADDRESSES.RWAToken.slice(0, 6)}...{ADDRESSES.RWAToken.slice(-4)}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
              <button 
                onClick={() => window.location.href = "/swap"} 
                style={{ padding: "8px 16px", background: "#10b981", color: "black", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", transition: "all 0.2s" }} 
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"} 
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                Buy RWA ↗
              </button>
              
              <button 
                onClick={async () => {
                  if (connector && (connector as any).request) {
                    try {
                      await (connector as any).request({
                        method: 'wallet_watchAsset',
                        params: { type: 'ERC20', options: { address: ADDRESSES.RWAToken, symbol: 'RWA', decimals: 18, image: 'https://cdn-icons-png.flaticon.com/512/2535/2535072.png' } },
                      });
                    } catch (e: any) { alert(`Copy the contract address on the left to import manually:\n${ADDRESSES.RWAToken}`); }
                  } else { 
                    alert(`Wallet sync unavailable. Copy the contract address to import manually:\n${ADDRESSES.RWAToken}`); 
                  }
                }}
                style={{ padding: "6px 12px", background: "transparent", color: "#10b981", border: "1px dashed rgba(16, 185, 129, 0.5)", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                + Add to Wallet
              </button>

            </div>

            <style jsx>{`
              @keyframes pulse { 0% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } 100% { opacity: 0.4; transform: scale(1); } }
            `}</style>
          </div>
        </div>

        {/* Seller Section: My Registered Properties */}
        {myLands.length > 0 && (
          <div className="my-listings" style={{ marginBottom: "60px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>
                <h3 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>My Property Listings</h3>
                <span style={{ color: "#9ca3af", fontSize: "14px" }}>{myLands.length} Total Registered</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
                {myLands.map(land => (
                    <div 
                      key={land.id} 
                      onClick={() => window.location.href = `/property/${land.id}`}
                      style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "20px", padding: "24px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                            <div>
                              <h4 style={{ fontSize: "18px", fontWeight: "700", color: "white", margin: 0 }}>{land.title}</h4>
                              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px" }}>ID: #{land.onChainId || land.id}</p>
                            </div>
                            <div style={{ 
                                padding: "4px 10px", 
                                background: land.status === "LISTED" ? "rgba(34, 197, 94, 0.1)" : land.status === "PENDING" ? "rgba(245, 158, 11, 0.1)" : "rgba(124, 58, 237, 0.1)", 
                                color: land.status === "LISTED" ? "#4ade80" : land.status === "PENDING" ? "#f59e0b" : "#a78bfa", 
                                borderRadius: "12px", 
                                fontSize: "10px", 
                                fontWeight: "800",
                                textTransform: "uppercase"
                            }}>
                              {land.status}
                            </div>
                        </div>
                        <div style={{ marginTop: "auto" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>Total Supply</span>
                                <span style={{ color: "white", fontWeight: "600" }}>{land.totalTokens} Tokens</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>Asset Value</span>
                                <span style={{ color: "#7c3aed", fontWeight: "700" }}>{land.price.toLocaleString()} RWA</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {(portfolioStats.assetCount === 0 && myLands.length === 0 && user?.role !== "ADMIN" && user?.role !== "VALIDATOR") && (
          <div style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px dashed rgba(124, 58, 237, 0.5)", borderRadius: "16px", padding: "30px", marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "white" }}>Your Portfolio is Empty</h3>
              <p style={{ color: "#a78bfa", marginTop: "8px", marginBottom: 0, fontSize: "16px" }}>Start buying tokenized real world assets to build your wealth today.</p>
            </div>
            <button onClick={() => window.location.href = "/buy"} style={{ padding: "14px 28px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 10px 20px rgba(124, 58, 237, 0.3)" }}>
              Explore Marketplace
            </button>
          </div>
        )}

        {/* My Assets Portfolio Section */}
        {ownedLandsData.length > 0 && (
          <div className="portfolio-assets" style={{ marginBottom: "60px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>
                <h3 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>My Portfolio Assets</h3>
                <button onClick={() => window.location.href = "/my-assets"} style={{ background: "transparent", border: "1px solid #7c3aed", color: "#a78bfa", padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>View All Portfolio →</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px", alignItems: "stretch" }}>
                {ownedLandsData.map(land => (
                    <div 
                      key={land.id} 
                      onClick={() => window.location.href = `/buy?id=${land.id}`}
                      style={{ background: "rgba(124, 58, 237, 0.05)", backdropFilter: "blur(16px)", borderRadius: "20px", padding: "24px", border: "1px solid rgba(124, 58, 237, 0.2)", display: "flex", flexDirection: "column", cursor: "pointer", transition: "transform 0.2s" }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h4 style={{ fontSize: "18px", fontWeight: "700", color: "white", margin: 0 }}>{land.title}</h4>
                            <div style={{ padding: "4px 10px", background: "rgba(74, 222, 128, 0.1)", color: "#4ade80", borderRadius: "12px", fontSize: "10px", fontWeight: "800" }}>INVESTMENT</div>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "12px", marginBottom: "15px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>Tokens Owned</span>
                                <span style={{ color: "#4ade80", fontWeight: "bold" }}>{land.userBalance} units</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>Current Value</span>
                                <span style={{ color: "white", fontWeight: "bold" }}>{land.value.toLocaleString()} RWA</span>
                            </div>
                        </div>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={land.location}>📍 {land.location}</p>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* Opportunities Section */}
        <div className="opportunities">
          <h3 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Available Assets</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px", alignItems: "stretch" }}>
            {allLands.filter(land => land.ownerId !== user.id).map(land => {
              const isFav = favoriteLands.includes(land.id);
              return (
                <div key={land.id} style={{ background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(16px)", borderRadius: "20px", padding: "24px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", transition: "all 0.3s ease", position: "relative" }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(land.id); }}
                    style={{ position: "absolute", top: "20px", right: "20px", border: "none", background: "rgba(255,255,255,0.05)", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", color: isFav ? "#ef4444" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                  >
                    <svg width="16" height="16" fill={isFav ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", width: "calc(100% - 40px)" }}>
                    <h4 style={{ fontSize: "18px", fontWeight: "700", color: "white", margin: 0 }}>{land.title}</h4>
                  </div>
                  <span style={{ padding: "4px 10px", background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", borderRadius: "12px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", width: "fit-content", marginBottom: "12px" }}>Listed</span>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <span style={{ display: "block", color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>Unit Price</span>
                      <span style={{ color: "#4ade80", fontWeight: "700", fontSize: "16px" }}>{(land.price / (land.totalTokens || 1000)).toLocaleString()} RWA</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>Supply</span>
                      <span style={{ color: "white", fontWeight: "600", fontSize: "16px" }}>{land.totalTokens || 1000}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => window.location.href = "/buy"} 
                    style={{ 
                      marginTop: "auto",
                      width: "100%", 
                      padding: "12px", 
                      background: "linear-gradient(90deg, #7c3aed, #4f46e5)", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "12px", 
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
                    }}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}