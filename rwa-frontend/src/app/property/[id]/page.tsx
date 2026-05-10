"use client";
import { useEffect, useState, use } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";
import BuyLandModal from "@/src/components/BuyLandModal";
import { useAccount, usePublicClient } from "wagmi";
import { ADDRESSES, LandTokenABI, RWAMarketplaceABI } from "../../../lib/contracts/abi";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: landId } = use(params);
    const [land, setLand] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [availableOnChain, setAvailableOnChain] = useState<number | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [holders, setHolders] = useState<any[]>([]);
    const [holdersLoading, setHoldersLoading] = useState(true);

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();

    const fetchBlockchainData = async () => {
        if (!land || !publicClient || !RWAMarketplaceABI) return;
        try {
            const tokenId = BigInt(land.onChainId || land.id);
            
            // 1. Fetch User Balance
            if (address) {
                const bal = await publicClient.readContract({
                    address: ADDRESSES.LandToken as `0x${string}`,
                    abi: LandTokenABI,
                    functionName: "balanceOf",
                    args: [address as `0x${string}`, tokenId],
                }) as bigint;
                setUserBalance(Number(bal));
            }

            // 2. Fetch Marketplace Availability
            const listing = await publicClient.readContract({
                address: ADDRESSES.RWAMarketplace as `0x${string}`,
                abi: RWAMarketplaceABI,
                functionName: "listings",
                args: [tokenId],
            }) as any;
            
            if (listing && listing[2]) { // index 2 is availableFractions in the struct
                setAvailableOnChain(Number(listing[2]));
            }
        } catch (e) { console.error("Blockchain Sync Error:", e); }
    };

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setConnectionError(false);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/land/${landId}`);
                if (res.ok) {
                    const data = await res.json();
                    setLand(data);
                } else if (res.status === 404) {
                    setLand(null);
                } else {
                    setConnectionError(true);
                }
            } catch (err) {
                console.error(err);
                setConnectionError(true);
            } finally {
                setLoading(false);
            }
        };

        const checkKyc = () => {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            setIsVerified(user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED");
        };

        const fetchHolders = async () => {
            try {
                // Force sync user's on-chain balance to the backend ledger before fetching
                const token = localStorage.getItem("token");
                if (token) {
                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/land/${landId}/sync`, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                    } catch (syncErr) { console.warn("Background sync failed:", syncErr); }
                }

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/land/${landId}/holders`);
                if (res.ok) {
                    const data = await res.json();
                    setHolders(data.holders);
                }
            } catch (err) { console.error("Holders Fetch Error:", err); }
            finally { setHoldersLoading(false); }
        };

        fetchDetails();
        checkKyc();
        fetchHolders();
    }, [landId]);

    useEffect(() => {
        fetchBlockchainData();
        const interval = setInterval(fetchBlockchainData, 10000);
        return () => clearInterval(interval);
    }, [address, land, publicClient]);

    if (loading) return <div className="loader" style={{ padding: "100px", textAlign: "center", color: "white" }}>Syncing with Oracle...</div>;
    
    if (connectionError) return (
        <div style={{ color: "white", textAlign: "center", padding: "100px", background: "#0f172a", minHeight: "100vh" }}>
            <h2 style={{ color: "#ef4444" }}>Blockchain Oracle Unreachable</h2>
            <p style={{ color: "#94a3b8" }}>The platform is unable to connect to the backend server (Port 3001).</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", background: "#3b82f6", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>Retry Connection</button>
        </div>
    );

    if (!land) return (
        <div style={{ color: "white", textAlign: "center", padding: "100px", background: "#0f172a", minHeight: "100vh" }}>
            <h2 style={{ color: "#f59e0b" }}>Asset Dossier Not Found</h2>
            <p style={{ color: "#94a3b8" }}>The requested property ID does not exist in our registered database.</p>
            <button onClick={() => window.location.href = "/buy"} style={{ marginTop: "20px", padding: "10px 20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", cursor: "pointer" }}>Return to Marketplace</button>
        </div>
    );

    const loc = (() => {
        try { return JSON.parse(land.location); } catch { return { address: land.location }; }
    })();

    return (
        <AuthGuard>
            <div style={{ minHeight: "100vh", position: "relative", color: "white" }}>
                <ParticleBackground />
                <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "100px 20px" }}>
                    
                    {/* Header Back Button */}
                    <button onClick={() => window.location.href = "/buy"} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 20px", borderRadius: "12px", cursor: "pointer", marginBottom: "40px", fontWeight: "bold" }}>← Back to Marketplace</button>

                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "40px", alignItems: "start" }}>
                        
                        {/* LEFT COLUMN: VISUALS & DESC */}
                        <div>
                            <div style={{ borderRadius: "30px", overflow: "hidden", height: "450px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "40px", background: "#0f172a" }}>
                                {loc.lat && loc.lng ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=k&z=17&output=embed`}
                                        allowFullScreen
                                    />
                                ) : (
                                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "100px" }}>🏞️</div>
                                )}
                            </div>

                            <h1 style={{ fontSize: "48px", fontWeight: "900", marginBottom: "15px" }}>{land.title}</h1>
                            <p style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", marginBottom: "30px" }}>
                                📍 {loc.address}
                            </p>

                            <div style={{ background: "rgba(255,255,255,0.02)", padding: "30px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px", color: "#94a3b8" }}>Asset Overview</h3>
                                <p style={{ fontSize: "16px", lineHeight: "1.8", color: "#cbd5e1" }}>{land.description}</p>
                            </div>

                            {/* OWNERSHIP & GOVERNANCE TABLE */}
                            <div style={{ background: "rgba(255,255,255,0.02)", padding: "30px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", marginTop: "30px" }}>
                                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px", color: "#94a3b8" }}>Asset Governance & Ownership</h3>
                                <div style={{ display: "flex", gap: "40px", alignItems: "center", flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 300px", overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", color: "#cbd5e1" }}>
                                            <thead>
                                                <tr style={{ textAlign: "left", fontSize: "12px", textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                    <th style={{ padding: "12px 0" }}>Holder</th>
                                                    <th style={{ padding: "12px 0" }}>Role</th>
                                                    <th style={{ padding: "12px 0" }}>Stake</th>
                                                    <th style={{ padding: "12px 0", textAlign: "right" }}>Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {holdersLoading ? (
                                                    <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center" }}>Fetching Ledger...</td></tr>
                                                ) : holders.length === 0 ? (
                                                    <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center" }}>No fractional owners yet.</td></tr>
                                                ) : (() => {
                                                    const pieColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];
                                                    return holders.map((h: any, i: number) => (
                                                        <tr key={i} style={{ borderBottom: i === holders.length - 1 ? "none" : "1px solid rgba(255,255,255,0.02)" }}>
                                                            <td style={{ padding: "15px 0" }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", color: "white" }}>
                                                                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: pieColors[i % pieColors.length], boxShadow: `0 0 8px ${pieColors[i % pieColors.length]}` }}></div>
                                                                    <div>
                                                                        {h.name}
                                                                        {h.address ? (
                                                                            <div style={{ marginTop: "2px" }}>
                                                                                <a 
                                                                                    href={`https://amoy.polygonscan.com/address/${h.address}`} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "normal", textDecoration: "none" }}
                                                                                    onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                                                                                    onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                                                                                >
                                                                                    {h.address.slice(0, 6)}...{h.address.slice(-4)} ↗
                                                                                </a>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>No Address</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: "15px 0", fontSize: "12px" }}>
                                                                <span style={{ 
                                                                    padding: "4px 8px", 
                                                                    borderRadius: "4px", 
                                                                    background: h.role === "SELLER" ? "rgba(59, 130, 246, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                                                    color: h.role === "SELLER" ? "#3b82f6" : "#10b981",
                                                                    fontWeight: "bold"
                                                                }}>
                                                                    {h.role}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: "15px 0" }}>{h.tokens} Units</td>
                                                            <td style={{ padding: "15px 0", textAlign: "right", fontWeight: "900", color: "#3b82f6" }}>{h.percentage}%</td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {!holdersLoading && holders.length > 0 && (
                                        <div style={{ width: "240px", height: "240px", flexShrink: 0, position: "relative" }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={holders.map((h: any) => ({ name: h.name, value: parseFloat(h.percentage), tokens: h.tokens, address: h.address }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={95}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {holders.map((_: any, index: number) => {
                                                            const pieColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];
                                                            return <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip 
                                                        wrapperStyle={{ pointerEvents: "auto" }}
                                                        content={({ active, payload }: any) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div style={{ background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", padding: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                                                                        <div style={{ fontWeight: "900", fontSize: "14px", color: payload[0].fill, marginBottom: "2px" }}>{data.name}</div>
                                                                        {data.address ? (
                                                                            <a 
                                                                                href={`https://amoy.polygonscan.com/address/${data.address}`} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                style={{ display: "inline-block", fontSize: "11px", color: "#3b82f6", marginBottom: "8px", fontFamily: "monospace", textDecoration: "none" }}
                                                                                onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                                                                                onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                                                                            >
                                                                                {data.address} ↗
                                                                            </a>
                                                                        ) : (
                                                                            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px", fontFamily: "monospace" }}>No Address</div>
                                                                        )}
                                                                        <div style={{ fontSize: "14px", fontWeight: "bold", color: "white" }}>{data.value}% <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "normal" }}>({data.tokens} Units)</span></div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", flexDirection: "column" }}>
                                                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>HOLDERS</span>
                                                <span style={{ fontSize: "28px", color: "white", fontWeight: "900" }}>{holders.length}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: INVESTMENT BOX */}
                        <div style={{ position: "sticky", top: "100px" }}>
                            <div style={{ background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(32px)", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.1)", padding: "40px", boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "bold" }}>Total Valuation ({land.tokenSymbol || "RWA-ASSET"})</span>
                                        <h2 style={{ fontSize: "32px", fontWeight: "900" }}>{land.price.toLocaleString()} <span style={{ fontSize: "16px", fontWeight: "normal" }}>RWA</span></h2>
                                    </div>
                                    <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", padding: "8px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: "bold" }}>VERIFIED</div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
                                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "15px" }}>
                                        <span style={{ fontSize: "11px", color: "#64748b" }}>FRACTIONAL PRICE</span>
                                        <div style={{ fontSize: "18px", fontWeight: "bold" }}>{(land.price / (land.totalTokens || 1000)).toLocaleString()} RWA</div>
                                    </div>
                                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "15px" }}>
                                        <span style={{ fontSize: "11px", color: "#64748b" }}>AVAILABLE</span>
                                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3b82f6" }}>{availableOnChain !== null ? availableOnChain : land.availableTokens} {land.tokenSymbol || "Units"}</div>
                                    </div>
                                </div>

                                {userBalance > 0 && (
                                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px dashed #10b981", padding: "15px", borderRadius: "15px", marginBottom: "30px", textAlign: "center" }}>
                                        <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "bold" }}>YOUR INVESTMENT: {userBalance} UNITS</span>
                                    </div>
                                )}

                                {isConnected && address?.toLowerCase() === land.owner.walletAddress?.toLowerCase() ? (
                                    <button 
                                        onClick={() => window.location.href = "/dashboard"}
                                        style={{ 
                                            width: "100%", 
                                            padding: "18px", 
                                            borderRadius: "16px", 
                                            border: "1px solid #7c3aed", 
                                            background: "rgba(124, 58, 237, 0.1)", 
                                            color: "#a78bfa", 
                                            fontSize: "18px", 
                                            fontWeight: "900", 
                                            cursor: "pointer",
                                        }}
                                    >
                                        MANAGE YOUR LISTING
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => isVerified ? setShowBuyModal(true) : alert("KYC Required")}
                                        style={{ 
                                            width: "100%", 
                                            padding: "18px", 
                                            borderRadius: "16px", 
                                            border: "none", 
                                            background: "linear-gradient(90deg, #10b981, #34d399)", 
                                            color: "black", 
                                            fontSize: "18px", 
                                            fontWeight: "900", 
                                            cursor: "pointer",
                                            boxShadow: "0 15px 30px rgba(16, 185, 129, 0.2)"
                                        }}
                                    >
                                        INVEST NOW
                                    </button>
                                )}
                                
                                <p style={{ textAlign: "center", color: "#64748b", fontSize: "12px", marginTop: "20px" }}>Secured by Polygon Amoy Smart Contracts</p>
                            </div>

                            {/* OWNER CARD */}
                            <div style={{ marginTop: "30px", background: "rgba(255,255,255,0.02)", borderRadius: "24px", padding: "20px", border: isConnected && address?.toLowerCase() === land.owner.walletAddress?.toLowerCase() ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "15px" }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{land.owner.name.charAt(0)}</div>
                                <div>
                                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>{land.owner.name} {isConnected && address?.toLowerCase() === land.owner.walletAddress?.toLowerCase() && "(You)"}</div>
                                    <div style={{ fontSize: "12px", color: "#64748b" }}>Registered Asset Owner</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {showBuyModal && <BuyLandModal land={land} onClose={() => { setShowBuyModal(false); window.location.reload(); }} />}
            </div>
        </AuthGuard>
    );
}
