"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";
import { useAccount, usePublicClient } from "wagmi";
import { ADDRESSES, LandTokenABI, RWATokenABI } from "@/src/lib/contracts/abi";
import { formatUnits } from "viem";

export default function MyAssetsPage() {
    const [ownedLands, setOwnedLands] = useState<any[]>([]);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();

    useEffect(() => {
        if (!address || !isConnected || !publicClient) return;

        const fetchAllAssets = async () => {
            try {
                const token = localStorage.getItem("token");
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                setCurrentUserId(user.id || null);
                
                // 1. Fetch available marketplace lands AND user's own listings
                const [resAll, resMy] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/land/all`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/land/my`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                const allLands = await resAll.json();
                const myLands = resMy.ok ? await resMy.json() : [];

                setMyListings(myLands);

                // 2. Scan for token weights in ALL relevant properties
                // Combine lists to ensure we check properties that might not be 'LISTED' yet but are owned by user
                const uniqueLandIds = new Set();
                const combinedLands = [...allLands, ...myLands].filter(land => {
                    if (uniqueLandIds.has(land.id)) return false;
                    uniqueLandIds.add(land.id);
                    return true;
                });

                const owned: any[] = [];
                const promises = combinedLands.map(async (land: any) => {
                    try {
                        // Skip if no on-chain ID yet (still pending/verifying)
                        if (!land.onChainId) return;

                        const tokenId = BigInt(land.onChainId);
                        const bal = await publicClient.readContract({
                            address: ADDRESSES.LandToken as `0x${string}`,
                            abi: LandTokenABI,
                            functionName: "balanceOf",
                            args: [address as `0x${string}`, tokenId],
                        }) as bigint;

                        if (bal > 0n && land.ownerId !== user.id) {
                            const unitPrice = (land.price / (land.totalTokens || 1000));
                            owned.push({
                                ...land,
                                userBalance: Number(bal),
                                totalValue: Number(bal) * unitPrice
                            });
                        }
                    } catch (e) {
                        console.warn("Scan error for land", land.id);
                    }
                });

                await Promise.all(promises);
                setOwnedLands(owned);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllAssets();
    }, [address, isConnected, publicClient]);

    const totalPortfolioValue = ownedLands.reduce((acc, land) => acc + land.totalValue, 0);
    const totalArea = ownedLands.reduce((acc, land) => acc + (land.area * (land.userBalance / land.totalTokens)), 0);

    return (
        <AuthGuard>
            <div style={{ minHeight: "100vh", position: "relative" }}>
                <ParticleBackground />
                
                <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "100px 20px" }}>
                    
                    {/* Page Header */}
                    <div style={{ marginBottom: "60px" }}>
                        <h1 style={{ fontSize: "42px", fontWeight: "900", marginBottom: "10px", background: "linear-gradient(to right, #7c3aed, #4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            My Real Estate Portfolio
                        </h1>
                        <p style={{ color: "#94a3b8", fontSize: "16px" }}>Manage and monitor your fractionalized property holdings.</p>
                    </div>

                    {/* Portfolio Performance Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "25px", marginBottom: "60px" }}>
                        <div style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", padding: "30px", borderRadius: "24px" }}>
                            <span style={{ color: "#a78bfa", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>Net Asset Value</span>
                            <h2 style={{ fontSize: "42px", margin: "10px 0 0 0", color: "white" }}>{totalPortfolioValue.toLocaleString()} <span style={{ fontSize: "16px", color: "#64748b" }}>RWA</span></h2>
                        </div>
                        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "30px", borderRadius: "24px" }}>
                            <span style={{ color: "#6ee7b7", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>Total Managed Area</span>
                            <h2 style={{ fontSize: "42px", margin: "10px 0 0 0", color: "white" }}>{totalArea.toFixed(2)} <span style={{ fontSize: "16px", color: "#64748b" }}>Sq Ft</span></h2>
                        </div>
                    </div>

                    {/* Assets Grid */}
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "100px" }}>
                            <div className="loader" style={{ color: "#7c3aed", fontSize: "18px", fontWeight: "bold" }}>Analyzing blockchain holdings...</div>
                        </div>
                    ) : (
                        <>
                            {/* Portfolio Section */}
                            <div style={{ marginBottom: "80px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
                                    <h2 style={{ fontSize: "28px", fontWeight: "800", margin: 0 }}>Portfolio Holdings</h2>
                                    <span style={{ padding: "4px 12px", background: "rgba(74, 222, 128, 0.1)", color: "#4ade80", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>Investor View</span>
                                </div>
                                
                                {ownedLands.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "60px", background: "rgba(255,255,255,0.02)", borderRadius: "30px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                                        <h3 style={{ color: "#94a3b8", fontSize: "18px" }}>No fractional holdings detected in your wallet.</h3>
                                        <button onClick={() => window.location.href = "/buy"} style={{ marginTop: "20px", padding: "12px 30px", background: "#7c3aed", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold" }}>Browse Marketplace</button>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "30px" }}>
                                        {ownedLands.map(land => (
                                            <div 
                                              key={`owned-${land.id}`} 
                                              onClick={() => window.location.href = `/buy?id=${land.id}`}
                                              style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(20px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", cursor: "pointer", transition: "transform 0.3s" }}
                                              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
                                              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                                            >
                                                <div style={{ height: "160px", background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.2)), url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80')`, backgroundSize: "cover", display: "flex", alignItems: "flex-end", padding: "20px" }}>
                                                    <div style={{ padding: "6px 14px", background: "#7c3aed", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" }}>Token ID: #{land.onChainId}</div>
                                                </div>
                                                
                                                <div style={{ padding: "24px" }}>
                                                    <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: "bold" }}>{land.title}</h3>
                                                    <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📍 {land.location}</p>
                                                    
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                                            <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>My Fractions</span>
                                                            <div style={{ color: "#4ade80", fontWeight: "800", fontSize: "18px" }}>{land.userBalance}</div>
                                                        </div>
                                                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                                            <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Equity Value</span>
                                                            <div style={{ color: "white", fontWeight: "800", fontSize: "18px" }}>{land.totalValue.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Seller Listings Section */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
                                    <h2 style={{ fontSize: "28px", fontWeight: "800", margin: 0 }}>Registered Listings</h2>
                                    <span style={{ padding: "4px 12px", background: "rgba(124, 58, 237, 0.1)", color: "#a78bfa", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>Seller View</span>
                                </div>

                                {myListings.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "60px", background: "rgba(255,255,255,0.02)", borderRadius: "30px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                                        <h3 style={{ color: "#94a3b8", fontSize: "18px" }}>You haven't listed any properties yet.</h3>
                                        <button onClick={() => window.location.href = "/sell"} style={{ marginTop: "20px", padding: "12px 30px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", cursor: "pointer", fontWeight: "bold" }}>List New Property</button>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
                                        {myListings.map(land => (
                                            <div 
                                              key={`listing-${land.id}`} 
                                              onClick={() => window.location.href = `/property/${land.id}`}
                                              style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "20px", padding: "24px", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.2s" }}
                                              onMouseOver={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                                              onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                                                    <h4 style={{ fontSize: "18px", fontWeight: "700", color: "white", margin: 0 }}>{land.title}</h4>
                                                    <div style={{ 
                                                        padding: "4px 10px", 
                                                        background: land.status === "LISTED" ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                                                        color: land.status === "LISTED" ? "#4ade80" : "#f59e0b", 
                                                        borderRadius: "10px", 
                                                        fontSize: "10px", 
                                                        fontWeight: "900" 
                                                    }}>{land.status}</div>
                                                </div>
                                                <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "20px" }}>📍 {land.location}</p>
                                                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px" }}>
                                                    <div>
                                                        <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Total Supply</span>
                                                        <div style={{ color: "white", fontWeight: "bold" }}>{land.totalTokens} Units</div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Valuation</span>
                                                        <div style={{ color: "#7c3aed", fontWeight: "bold" }}>{land.price.toLocaleString()} RWA</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}


                </div>
            </div>
        </AuthGuard>
    );
}
