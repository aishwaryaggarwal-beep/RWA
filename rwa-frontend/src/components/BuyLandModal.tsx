"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount, useConfig } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import { ADDRESSES, RWAMarketplaceABI, RWATokenABI } from "@/src/lib/contracts/abi";

export default function BuyLandModal({ land, onClose }: { land: any; onClose: () => void }) {
  const [fractions, setFractions] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [rwaBalance, setRwaBalance] = useState<bigint>(0n);
  const [step, setStep] = useState<"IDLE" | "APPROVING" | "BUYING" | "SUCCESS">("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [pricePerFraction, setPricePerFraction] = useState<bigint>(0n);
  const { address, isConnected, connector } = useAccount();
  const config = useConfig();

  // The smart contract uses the blockchain-native Token ID.
  // We strictly prioritize onChainId from the database, which is set during minting.
  const tokenId = land.onChainId !== undefined && land.onChainId !== null ? Number(land.onChainId) : null; 
  const totalCost = pricePerFraction * BigInt(fractions);

  const fetchBalance = async () => {
    if (!address) return;
    try {
        const client = await getConnectorClient(config);
        const provider = new ethers.BrowserProvider(client.transport as any);
        const rwaToken = new ethers.Contract(ADDRESSES.RWAToken, RWATokenABI, provider);
        const bal = await rwaToken.balanceOf(address);
        setRwaBalance(bal);

        // Verification: Check if the Marketplace actually has a listing for this ID
        if (tokenId !== null) {
            const marketplace = new ethers.Contract(ADDRESSES.RWAMarketplace, RWAMarketplaceABI, provider);
            const listing = await marketplace.listings(tokenId);
            if (listing.isActive) {
                setPricePerFraction(listing.pricePerFraction);
            } else {
                console.warn("Blockchain Warning: This token is not currently listed for sale on-chain.");
                // Fallback to DB price calculation if listing is not active yet (for UI preview)
                const dbPrice = ethers.parseUnits((land.price / (land.totalTokens || 1000)).toString(), 18);
                setPricePerFraction(dbPrice);
            }
        }
    } catch (e) {
        console.error("Failed to fetch chain data", e);
    }
  };

  useEffect(() => {
    if (isConnected) fetchBalance();
  }, [isConnected, address]);

  const maxFractions = land.availableTokens;
  const isInsufficient = totalCost > rwaBalance;

  const handleBuy = async () => {
    if (!isConnected || !connector) {
      setError("Please connect your wallet to purchase.");
      return;
    }

    if (tokenId === null) {
      setError("This property has not been minted on the blockchain yet and cannot be purchased.");
      return;
    }

    if (isInsufficient) {
      setError(`Insufficient RWA Balance. You need ${ethers.formatUnits(totalCost, 18)} RWA but only have ${ethers.formatUnits(rwaBalance, 18)} RWA.`);
      return;
    }

    try {
      setLoading(true);
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

      const rwaToken = new ethers.Contract(ADDRESSES.RWAToken, RWATokenABI, signer);
      const marketplace = new ethers.Contract(ADDRESSES.RWAMarketplace, RWAMarketplaceABI, signer);

      const totalCostRWA = pricePerFraction * BigInt(fractions);

      // Fetch current network fee data to prevent "transaction gas price below minimum" errors
      const feeData = await provider.getFeeData();
      const minGas = ethers.parseUnits("30", "gwei");
      const txOverrides = {
          maxFeePerGas: feeData.maxFeePerGas && feeData.maxFeePerGas > minGas ? feeData.maxFeePerGas : minGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minGas ? feeData.maxPriorityFeePerGas : minGas,
      };

      // Step 1: Check Allowance
      const currentAllowance = await rwaToken.allowance(await signer.getAddress(), ADDRESSES.RWAMarketplace);
      if (currentAllowance < totalCostRWA) {
         // Approve MarketPlace to spend our RWA Token
         const approveTx = await rwaToken.approve(ADDRESSES.RWAMarketplace, totalCostRWA, txOverrides);
         await approveTx.wait();
      }

      setStep("BUYING");

      // Step 2: Buy Fractions
      const buyTx = await marketplace.buyFractions(tokenId, fractions, txOverrides);
      const receipt = await buyTx.wait();
      
      console.log("Purchase Success! Transaction Hash:", receipt.hash);

      // Step 3: Trigger a Manual Refresh of the local holdings state
      if (typeof window !== "undefined") {
          // Dispatch a custom event that BuyLand page can listen to for refreshing holdings
          window.dispatchEvent(new CustomEvent("rwa-holdings-update"));
      }

      // ✅ Step 4: Inform backend to sync DB
      const token = localStorage.getItem("token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/land/${land.id}/sync`, { 
          method: "POST",
          headers: {
              "Authorization": `Bearer ${token}`
          }
      });
      
      setStep("SUCCESS");
      await fetchBalance(); // Refresh the RWA balance locally as well
      
    } catch (err: any) {
      console.error(err);
      setError(err.reason || err.message || "Transaction failed");
      setStep("IDLE");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(2, 6, 23, 0.95)", backdropFilter: "blur(15px)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "#0f172a", width: "100%", maxWidth: "500px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", padding: "30px", boxShadow: "0 50px 100px rgba(0,0,0,0.8)", position: "relative" }}>
            
            <button onClick={onClose} disabled={loading} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "white", cursor: loading ? "not-allowed" : "pointer" }}>
                ✕
            </button>

            <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>Buy {land.title} Fractions</h2>
            <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "14px" }}>
                Purchase tokenized fractions of this verified real estate asset.
            </p>

            {step === "SUCCESS" ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: "50px", marginBottom: "20px" }}>🎉</div>
                    <h3 style={{ color: "#4ade80", margin: "0 0 10px 0" }}>Purchase Successful!</h3>
                    <p style={{ color: "#94a3b8", fontSize: "14px" }}>You now own {fractions} fractions of this property.</p>
                    <button className="btn" onClick={onClose} style={{ marginTop: "30px", width: "100%" }}>Done</button>
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: "25px", background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                            <span style={{ color: "#94a3b8" }}>Available Fractions</span>
                            <span style={{ color: "white", fontWeight: "bold" }}>{maxFractions} left</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#94a3b8" }}>Your Balance</span>
                            <span style={{ color: isInsufficient ? "#ef4444" : "#4ade80", fontWeight: "bold" }}>{Number(ethers.formatUnits(rwaBalance, 18)).toLocaleString()} RWA</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: "30px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                            <label style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "500" }}>Number of Fractions to Buy:</label>
                            {isInsufficient && <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "bold" }}>⚠️ Insufficient Funds</span>}
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max={maxFractions} 
                            value={fractions} 
                            onChange={(e) => setFractions(parseInt(e.target.value))}
                            style={{ width: "100%", cursor: "pointer", accentColor: isInsufficient ? "#ef4444" : "#3b82f6" }}
                            disabled={loading}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                            <span style={{ color: "white", fontWeight: "bold", fontSize: "20px" }}>{fractions} Fractions</span>
                            <div style={{ textAlign: "right" }}>
                                <span style={{ color: "#94a3b8", fontSize: "12px", display: "block" }}>Total Cost</span>
                                <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "20px" }}>{Number(ethers.formatUnits(totalCost, 18)).toLocaleString()} RWA</span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", fontSize: "13px", marginBottom: "20px", wordBreak: "break-word" }}>
                            {error}
                        </div>
                    )}

                    <button 
                        className="btn" 
                        style={{ width: "100%", background: loading ? "#1e293b" : isInsufficient ? "#451a1a" : "#3b82f6", cursor: (loading || isInsufficient) ? "not-allowed" : "pointer", color: isInsufficient ? "#ef4444" : "white", border: isInsufficient ? "1px solid #ef4444" : "none" }}
                        onClick={handleBuy}
                        disabled={loading || isInsufficient || fractions < 1 || fractions > maxFractions}
                    >
                        {isInsufficient ? "Insufficient RWA Balance" : (
                            <>
                                {step === "APPROVING" && "⏳ Approving RWA Token..."}
                                {step === "BUYING" && "⏳ Confirming Purchase..."}
                                {step === "IDLE" && "Approve & Buy with RWA"}
                            </>
                        )}
                    </button>
                    {/* Removed legacy MetaMask check */}

                </>
            )}
        </div>
    </div>
  );
}
