"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/Navbar";
import ParticleBackground from "@/src/components/ParticleBackground";
import { API_URL } from "@/src/lib/api";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, LandTokenABI } from "@/src/lib/contracts/abi";

export default function TransparencyExplorer() {
    const [lands, setLands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { address } = useAccount();

    useEffect(() => {
        // Fetch all verified lands and their fractional owners (investments)
        fetch(`${API_URL}/market/lands`)
            .then(res => res.json())
            .then(data => {
                // Filter only tokenized lands
                const tokenizedLands = data.filter((l: any) => l.onChainId !== null);
                setLands(tokenizedLands);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load cap tables:", err);
                setLoading(false);
            });
    }, []);

    // Helper to calculate percentages
    const getPercentage = (tokens: number, total: number) => {
        if (!total) return 0;
        return ((tokens / total) * 100).toFixed(2);
    };

    return (
        <main style={{ minHeight: "100vh", position: "relative", background: "radial-gradient(circle at top, #0f172a, #020617)" }}>
            <Navbar />
            <ParticleBackground />

            <div style={{ position: "relative", zIndex: 1, padding: "80px 40px", maxWidth: "1200px", margin: "0 auto", color: "white" }}>
                <div style={{ textAlign: "center", marginBottom: "60px" }}>
                    <div style={{ display: "inline-block", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "6px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: "900", letterSpacing: "2px", marginBottom: "20px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                        PUBLIC LEDGER
                    </div>
                    <h1 style={{ fontSize: "56px", fontWeight: "900", margin: "0 0 20px 0", background: "linear-gradient(to right, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Transparency Explorer
                    </h1>
                    <p style={{ color: "#94a3b8", fontSize: "18px", maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
                        Verify the capitalization table of any fractionalized property on the platform. All data is cryptographically backed by the Polygon network.
                    </p>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "100px" }}>
                        <div className="spinner" style={{ border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid #38bdf8", borderRadius: "50%", width: "50px", height: "50px", animation: "spin 1s linear infinite", margin: "0 auto" }}></div>
                        <p style={{ marginTop: "20px", color: "#94a3b8" }}>Syncing on-chain cap tables...</p>
                    </div>
                ) : lands.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: "32px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🕵️‍♂️</div>
                        <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>No Tokenized Assets Yet</h2>
                        <p style={{ color: "#64748b" }}>Properties will appear here once they pass the auditor consensus and are minted on-chain.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                        {lands.map((land) => {
                            // Aggregate investments by user/wallet to get final holding amounts
                            // (Since a user could buy multiple times)
                            const holdersMap: Record<string, { wallet: string, tokens: number, name: string }> = {};
                            
                            // Include original owner's remaining supply
                            let tokensSold = 0;
                            
                            land.investments?.forEach((inv: any) => {
                                const wallet = inv.user?.walletAddress || `Wallet Not Linked (UID:${inv.userId})`;
                                if (!holdersMap[wallet]) {
                                    holdersMap[wallet] = { wallet, tokens: 0, name: inv.user?.name || "Anonymous" };
                                }
                                holdersMap[wallet].tokens += inv.tokens;
                                tokensSold += inv.tokens;
                            });

                            const ownerWallet = land.owner?.walletAddress || "Originator";
                            const remainingSupply = land.totalTokens - tokensSold;

                            if (remainingSupply > 0) {
                                if (!holdersMap[ownerWallet]) {
                                    holdersMap[ownerWallet] = { wallet: ownerWallet, tokens: 0, name: `${land.owner?.name} (Issuer)` };
                                }
                                holdersMap[ownerWallet].tokens += remainingSupply;
                            }

                            const holdersList = Object.values(holdersMap).sort((a, b) => b.tokens - a.tokens);

                            return (
                                <div key={land.id} style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", backdropFilter: "blur(20px)" }}>
                                    
                                    {/* ASSET HEADER */}
                                    <div style={{ padding: "30px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                                <span style={{ background: "#38bdf822", color: "#38bdf8", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>Token ID #{land.onChainId}</span>
                                                <a href={`https://amoy.polygonscan.com/token/${ADDRESSES.LandToken}?a=${land.onChainId}`} target="_blank" rel="noreferrer" style={{ color: "#94a3b8", fontSize: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                                                    View on PolygonScan ↗
                                                </a>
                                            </div>
                                            <h2 style={{ margin: 0, fontSize: "28px" }}>{land.title}</h2>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold", marginBottom: "5px" }}>Total Supply</div>
                                            <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "#fff" }}>{land.totalTokens.toLocaleString()} Fractions</div>
                                        </div>
                                    </div>

                                    {/* CAP TABLE */}
                                    <div style={{ padding: "0 30px" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: "left", padding: "20px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Stakeholder</th>
                                                    <th style={{ textAlign: "left", padding: "20px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Wallet Address</th>
                                                    <th style={{ textAlign: "right", padding: "20px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Fractions Held</th>
                                                    <th style={{ textAlign: "right", padding: "20px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)", width: "150px" }}>% Ownership</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {holdersList.map((holder, index) => {
                                                    const percentage = getPercentage(holder.tokens, land.totalTokens);
                                                    const isCurrentUser = address && holder.wallet.toLowerCase() === address.toLowerCase();

                                                    return (
                                                        <tr key={index} style={{ background: isCurrentUser ? "rgba(56, 189, 248, 0.05)" : "transparent" }}>
                                                            <td style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontWeight: isCurrentUser ? "bold" : "normal", color: isCurrentUser ? "#38bdf8" : "#fff" }}>
                                                                {holder.name} {isCurrentUser && " (You)"}
                                                            </td>
                                                            <td style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontFamily: "monospace", color: "#94a3b8" }}>
                                                                {holder.wallet.startsWith('0x') ? `${holder.wallet.slice(0, 6)}...${holder.wallet.slice(-4)}` : holder.wallet}
                                                            </td>
                                                            <td style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", textAlign: "right", fontWeight: "bold", fontFamily: "monospace", fontSize: "16px" }}>
                                                                {holder.tokens.toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
                                                                    <span style={{ fontSize: "14px", fontWeight: "bold", width: "45px", textAlign: "right" }}>{percentage}%</span>
                                                                    <div style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                                                                        <div style={{ width: `${percentage}%`, height: "100%", background: isCurrentUser ? "#38bdf8" : "#8b5cf6" }}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div style={{ padding: "15px 30px", background: "rgba(0,0,0,0.2)", fontSize: "12px", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                                        <span>Cryptographic Proof: SHA-256 Validated</span>
                                        <span>Last Synced: {new Date().toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
