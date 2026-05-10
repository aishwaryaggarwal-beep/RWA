"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useBalance, useConfig } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import { parseEther, formatUnits, parseGwei } from "viem";
import { ADDRESSES, RWATokenABI } from "@/src/lib/contracts/abi";

export default function SwapPortal() {
    const { address, isConnected, chainId, connector } = useAccount();
    const { switchChain } = useSwitchChain();
    const { writeContract, data: hash, error, isPending } = useWriteContract();
    const config = useConfig();
    
    // Balance hook for POL (Native)
    const { data: balanceData } = useBalance({ address });

    const [polAmount, setPolAmount] = useState("0.1");
    const [rwaResult, setRwaResult] = useState("1000");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Rate: 1 POL = 10,000 RWA
    const RATE = 10000;

    // Ensure correct chain
    useEffect(() => {
        if (isConnected && chainId !== 80002) {
            switchChain({ chainId: 80002 });
        }
    }, [isConnected, chainId, switchChain]);

    useEffect(() => {
        const amt = parseFloat(polAmount) || 0;
        setRwaResult((amt * RATE).toLocaleString());
    }, [polAmount]);

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed) {
            setSuccess(true);
            setLoading(false);
            alert("Swap Successful! RWA tokens have been minted to your wallet.");
        }
    }, [isConfirmed]);

    const handleSwap = async () => {
        if (!isConnected) return alert("Please connect your wallet first");
        if (chainId !== 80002) {
            switchChain({ chainId: 80002 });
            return;
        }

        try {
            setLoading(true);
            setSuccess(false);

            console.log(`Swapping ${polAmount} POL for RWA... (Optimizing Gas for Amoy)`);
            
            writeContract({
                address: ADDRESSES.RWAToken as `0x${string}`,
                abi: RWATokenABI,
                functionName: 'buyTokens',
                value: parseEther(polAmount),
                // Polygon Amoy often requires higher gas fees than defaults
                maxPriorityFeePerGas: parseGwei('30'), 
                maxFeePerGas: parseGwei('50'),
            });

        } catch (err: any) {
            console.error("Swap Error:", err);
            setLoading(false);
            alert("Swap initialization failed: " + (err.shortMessage || err.message));
        }
    };

    // Reset loading state on error
    useEffect(() => {
        if (error) {
            setLoading(false);
            
            // Log for debugging but don't alert the user if they manually cancelled
            const errorMessage = (error as any).shortMessage || error.message || "";
            if (errorMessage.toLowerCase().includes("user rejected") || errorMessage.toLowerCase().includes("rejected the request")) {
                console.log("Transaction cancelled by user.");
            } else {
                console.error(error);
                alert("Swap Failed: " + errorMessage);
            }
        }
    }, [error]);

    return (
        <AuthGuard>
            <ParticleBackground />
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", zIndex: 1 }}>
                
                <div style={{ background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "32px", padding: "40px", width: "100%", maxWidth: "450px", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
                    
                    <div style={{ textAlign: "center", marginBottom: "40px" }}>
                        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "900", background: "linear-gradient(to right, #7c3aed, #4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Native Swap Portal</h1>
                        <p style={{ color: "#94a3b8", marginTop: "10px", fontSize: "14px" }}>Exchange POL for RWA Unified Tokens instantly</p>
                    </div>

                    {/* Network Warning */}
                    {chainId !== 80002 && isConnected && (
                         <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", padding: "10px", borderRadius: "10px", marginBottom: "15px", textAlign: "center", color: "#fca5a5", fontSize: "13px" }}>
                            ⚠️ Please switch to Polygon Amoy Testnet
                         </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                        
                        {/* INPUT: POL */}
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "bold" }}>PAYING</span>
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Balance: {balanceData ? `${Number(balanceData.formatted).toFixed(4)} POL` : 'Loading...'}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <input 
                                    type="number" 
                                    value={polAmount}
                                    onChange={(e) => setPolAmount(e.target.value)}
                                    style={{ background: "transparent", border: "none", color: "white", fontSize: "24px", fontWeight: "bold", width: "100%", outline: "none" }}
                                    placeholder="0.0"
                                />
                                <span style={{ padding: "6px 12px", background: "rgba(124, 58, 237, 0.2)", color: "#c4b5fd", borderRadius: "10px", fontWeight: "bold", fontSize: "14px" }}>POL</span>
                            </div>
                        </div>

                        {/* ARROW ICON */}
                        <div style={{ display: "flex", justifyContent: "center", margin: "-15px 0" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", boxShadow: "0 0 15px rgba(74, 222, 128, 0.2)" }}>
                                ↓
                            </div>
                        </div>

                        {/* OUTPUT: RWA */}
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "bold" }}>RECEIVING</span>
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Est. Gain</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ color: "#4ade80", fontSize: "24px", fontWeight: "bold", width: "100%" }}>{rwaResult}</div>
                                <span style={{ padding: "6px 12px", background: "rgba(74, 222, 128, 0.2)", color: "#4ade80", borderRadius: "10px", fontWeight: "bold", fontSize: "14px" }}>RWA</span>
                            </div>
                        </div>

                        {/* SWAP BUTTON */}
                        <button 
                            disabled={loading || isPending || isConfirming}
                            onClick={handleSwap}
                            style={{ 
                                marginTop: "10px",
                                padding: "20px", 
                                borderRadius: "20px", 
                                background: (loading || isPending || isConfirming) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #7c3aed, #4f46e5)", 
                                color: "white", 
                                border: "none", 
                                fontWeight: "900", 
                                fontSize: "16px",
                                cursor: (loading || isPending || isConfirming) ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                boxShadow: (loading || isPending || isConfirming) ? "none" : "0 10px 30px rgba(124, 58, 237, 0.3)"
                            }}
                            onMouseOver={(e) => !(loading || isPending || isConfirming) && (e.currentTarget.style.transform = "translateY(-2px)")}
                            onMouseOut={(e) => !(loading || isPending || isConfirming) && (e.currentTarget.style.transform = "translateY(0)")}
                        >
                            {isPending ? "AWAITING WALLET..." : 
                             isConfirming ? "WATCHING BLOCKCHAIN..." :
                             loading ? "EXECUTING TRANSACTION..." : "INITIATE ON-CHAIN SWAP"}
                        </button>

                        <div style={{ textAlign: "center", fontSize: "12px", color: "#64748b" }}>
                            Gas-optimized smart contract interaction on Polygon Amoy.
                        </div>

                        {success && (
                            <button 
                                onClick={async () => {
                                    try {
                                        const client = await getConnectorClient(config);
                                        const internalProvider = client.transport;
                                        await (internalProvider as any).request({
                                            method: 'wallet_watchAsset',
                                            params: {
                                                type: 'ERC20',
                                                options: {
                                                    address: ADDRESSES.RWAToken,
                                                    symbol: 'RWA',
                                                    decimals: 18,
                                                },
                                            },
                                        });
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                style={{
                                    marginTop: "10px",
                                    padding: "12px",
                                    borderRadius: "15px",
                                    background: "rgba(74, 222, 128, 0.1)",
                                    border: "1px dashed #4ade80",
                                    color: "#4ade80",
                                    fontSize: "13px",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                }}
                            >
                                🦊 Import RWA Token to MetaMask
                            </button>
                        )}
                    </div>

                </div>

            </div>
        </AuthGuard>
    );
}
