"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useAccount, useConfig } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import { ADDRESSES, RWAMarketplaceABI, LandTokenABI } from "@/src/lib/contracts/abi";

export default function ListLandModal({ land, onClose }: { land: any; onClose: () => void }) {
    const [fractions, setFractions] = useState<number>(land.totalTokens || 1000);
    const [pricePerFraction, setPricePerFraction] = useState<number>(1000); // Default to 1000 RWA
    const [step, setStep] = useState<"IDLE" | "APPROVING" | "LISTING" | "SUCCESS">("IDLE");
    const [error, setError] = useState<string | null>(null);
    const { connector, isConnected } = useAccount();
    const config = useConfig();

    const handleList = async () => {
        if (!isConnected || !connector) {
            setError("Please connect your Web3 wallet to list your property.");
            return;
        }

        try {
            setError(null);
            setStep("APPROVING");

            const client = await getConnectorClient(config);
            const internalProvider = client.transport;
            const provider = new ethers.BrowserProvider(internalProvider as any);
            const network = await provider.getNetwork();

            if (Number(network.chainId) !== 80002) {
                try {
                    // Attempt to switch to the Polygon Amoy testnet
                    await (internalProvider as any).request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x13882' }], // 80002 in hex
                    });
                } catch (switchError: any) {
                    // Error code 4902 indicates the chain has not been added to MetaMask
                    if (switchError.code === 4902) {
                        try {
                            await (internalProvider as any).request({
                                method: 'wallet_addEthereumChain',
                                params: [
                                    {
                                        chainId: '0x13882',
                                        chainName: 'Polygon Amoy Testnet',
                                        nativeCurrency: {
                                            name: 'MATIC',
                                            symbol: 'MATIC',
                                            decimals: 18,
                                        },
                                        rpcUrls: ['https://rpc-amoy.polygon.technology'],
                                        blockExplorerUrls: ['https://amoy.polygonscan.com'],
                                    },
                                ],
                            });
                        } catch (addError) {
                            throw new Error("Failed to add Polygon Amoy network to your wallet.");
                        }
                    } else {
                        throw new Error(`Please switch to Polygon Amoy (Chain ID 80002). Currently on chain ${network.chainId}`);
                    }
                }

                // Refresh provider and chain check after switch attempt
                const newProvider = new ethers.BrowserProvider(internalProvider as any);
                const newNetwork = await newProvider.getNetwork();
                if (Number(newNetwork.chainId) !== 80002) {
                    throw new Error("Network switch failed. Please connect to Polygon Amoy.");
                }
            }

            const signer = await provider.getSigner();

            const landToken = new ethers.Contract(ADDRESSES.LandToken, LandTokenABI, signer);
            const marketplace = new ethers.Contract(ADDRESSES.RWAMarketplace, RWAMarketplaceABI, signer);

            const tokenId = land.onChainId !== undefined && land.onChainId !== null ? land.onChainId : land.id;
            if (tokenId === null || tokenId === undefined) {
                throw new Error("This asset does not have a valid on-chain Token ID yet.");
            }

            // Ensure the seller actually has these fraction tokens. 
            // If the backend hasn't minted them yet, this will fail in the smart contract!
            const balance = await landToken.balanceOf(await signer.getAddress(), tokenId);
            console.log("Balance:", balance);
            console.log("Fractions:", fractions);

            if (balance < fractions) {
                throw new Error(`You only own ${balance.toString()} fractions, but tried to list ${fractions}. The backend oracle may still be minting your tokens.`);
            }

            // Fetch current network fee data to prevent "transaction gas price below minimum" errors
            const feeData = await provider.getFeeData();
            const minGas = ethers.parseUnits("30", "gwei");
            const txOverrides = {
                maxFeePerGas: feeData.maxFeePerGas && feeData.maxFeePerGas > minGas ? feeData.maxFeePerGas : minGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minGas ? feeData.maxPriorityFeePerGas : minGas,
            };

            // Step 1: Approve Marketplace to transfer LandTokens (ERC1155)
            const isApproved = await landToken.isApprovedForAll(await signer.getAddress(), ADDRESSES.RWAMarketplace);
            if (!isApproved) {
                const approveTx = await landToken.setApprovalForAll(ADDRESSES.RWAMarketplace, true, txOverrides);
                await approveTx.wait();
            }

            setStep("LISTING");

            // Step 2: List on Marketplace
            const priceInWei = ethers.parseUnits(pricePerFraction.toString(), 18);
            const listTx = await marketplace.listLand(tokenId, land.id, fractions, priceInWei, txOverrides);
            await listTx.wait();

            // Mark as listed in the backend
            try {
                const token = localStorage.getItem("token");
                await fetch(`http://127.0.0.1:3001/land/${land.id}/list`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Backend sync for listing failed:", err);
            }

            setStep("SUCCESS");

        } catch (err: any) {
            console.error(err);
            
            // Handle user rejection gracefully
            const isUserRejection = 
                err.code === "ACTION_REJECTED" || 
                err.message?.toLowerCase().includes("user rejected") || 
                err.message?.toLowerCase().includes("rejected the request");

            if (isUserRejection) {
                console.log("Listing cancelled by user.");
            } else {
                setError(err.reason || err.message || "Transaction failed. Make sure your tokens are minted.");
            }
            setStep("IDLE");
        }
    };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(2, 6, 23, 0.95)", backdropFilter: "blur(15px)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#0f172a", width: "100%", maxWidth: "500px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", padding: "30px", boxShadow: "0 50px 100px rgba(0,0,0,0.8)", position: "relative" }}>

                <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "white", cursor: "pointer" }}>
                    ✕
                </button>

                <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>List on Marketplace</h2>
                <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "14px" }}>
                    Offer your verified real estate fractions for direct purchase using RWA tokens.
                </p>

                {step === "SUCCESS" ? (
                    <div style={{ textAlign: "center", padding: "30px 0" }}>
                        <div style={{ fontSize: "50px", marginBottom: "20px" }}>✅</div>
                        <h3 style={{ color: "#4ade80", margin: "0 0 10px 0" }}>Listing Successful!</h3>
                        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Buyers can now purchase your fractions on the open marketplace.</p>
                        <button className="btn" onClick={() => { onClose(); window.location.reload(); }} style={{ marginTop: "30px", width: "100%" }}>Done</button>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: "25px", background: "rgba(59, 130, 246, 0.05)", padding: "20px", borderRadius: "15px", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <label style={{ color: "#60a5fa", fontSize: "14px", fontWeight: "bold" }}>List Fractional Supply</label>
                                <span style={{ color: "white", fontWeight: "bold" }}>{Math.round((fractions / (land.totalTokens || 1000)) * 100)}%</span>
                            </div>

                            <input
                                type="range"
                                min="1"
                                max={land.totalTokens || 1000}
                                value={fractions}
                                onChange={(e) => setFractions(Number(e.target.value))}
                                style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer", marginBottom: "15px" }}
                            />

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Tokens to Sell</span>
                                    <span style={{ color: "#3b82f6", fontWeight: "800" }}>{fractions.toLocaleString()}</span>
                                </div>
                                <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Retained Equity</span>
                                    <span style={{ color: "#10b981", fontWeight: "800" }}>{((land.totalTokens || 1000) - fractions).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: "30px" }}>
                            <label style={{ display: "block", color: "#e2e8f0", marginBottom: "10px", fontSize: "14px", fontWeight: "500" }}>Public Offering Price (RWA per Token)</label>
                            <input className="input" type="number" value={pricePerFraction} onChange={(e) => setPricePerFraction(Number(e.target.value))} placeholder="e.g. 1000" />
                            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "5px" }}>The protocol will use this rate for all incoming investments.</p>
                        </div>

                        {error && (
                            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", fontSize: "13px", marginBottom: "20px", wordBreak: "break-word" }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", background: "rgba(16, 185, 129, 0.05)", padding: "20px", borderRadius: "12px", border: "1px dashed rgba(16, 185, 129, 0.2)" }}>
                            <span style={{ color: "#94a3b8", fontSize: "14px" }}>Max Capital Raise</span>
                            <span style={{ color: "#10b981", fontWeight: "bold" }}>{(fractions * pricePerFraction).toLocaleString()} RWA</span>
                        </div>

                        <button
                            className="btn"
                            style={{ width: "100%", background: step !== "IDLE" ? "#1e293b" : "linear-gradient(135deg, #10b981, #059669)", cursor: step !== "IDLE" ? "wait" : "pointer", boxShadow: "0 10px 20px rgba(16, 185, 129, 0.2)" }}
                            onClick={handleList}
                            disabled={step !== "IDLE"}
                        >
                            {step === "APPROVING" && "⏳ Approving Marketplace..."}
                            {step === "LISTING" && "⏳ Finalizing Web3 Listing..."}
                            {step === "IDLE" && "Verify & List Property"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
