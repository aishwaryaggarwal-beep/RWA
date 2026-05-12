"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";
import BuyLandModal from "@/src/components/BuyLandModal";
import { useAccount, usePublicClient } from "wagmi";
import { ADDRESSES, LandTokenABI } from "@/src/lib/contracts/abi";

interface Land {
  id: number;
  title: string;
  description: string;
  location: string;
  area: number;
  price: number;
  totalTokens: number;
  availableTokens: number;
  onChainId?: number;
  owner: {
    name: string;
    kyc?: { status: string };
  };
}

export default function BuyLand() {
  const [lands, setLands] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("NOT_SUBMITTED");
  const [selectedLandToBuy, setSelectedLandToBuy] = useState<Land | null>(null);
  const [userHoldings, setUserHoldings] = useState<Record<number, number>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => {
    // 1. Initial check from LocalStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(user.id || null);
    setKycStatus(user.kycStatus || "NOT_SUBMITTED");
    setIsVerified(user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED");

    // 2. Fetch latest status from backend
    const checkKycStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("https://rwa-pied.vercel.app/kyc/status", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const { status } = await res.json();
          setKycStatus(status);
          setIsVerified(status === "VERIFIED" || status === "APPROVED");

          // Update localStorage
          user.kycStatus = status;
          localStorage.setItem("user", JSON.stringify(user));
        }
      } catch (err) {
        console.error("Failed to fetch KYC status", err);
      }
    };

    checkKycStatus();

    // 3. Fetch lands
    const fetchLands = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://rwa-pied.vercel.app"}/land/all`);
        const data = await res.json()
        if (Array.isArray(data)) {
          setLands(data);
        } else {
          setLands([]);
        }
      } catch (err) {
        setLands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLands();
  }, []);

  // 4. Scan for User Holdings (Blockchain interaction)
  useEffect(() => {
    if (!address || lands.length === 0 || !publicClient) return;

    const scanUserTokens = async () => {
      const holdings: Record<number, number> = {};
      const promises = lands.map(async (land) => {
        try {
          const tokenId = BigInt(land.onChainId || land.id);
          const bal = await publicClient.readContract({
            address: ADDRESSES.LandToken as `0x${string}`,
            abi: LandTokenABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`, tokenId],
          }) as bigint;
          holdings[land.id] = Number(bal);
        } catch (e) {
          holdings[land.id] = 0;
        }
      });

      await Promise.all(promises);
      setUserHoldings(holdings);
    };

    scanUserTokens();

    // Listen for updates from the Buy Modal
    const handleUpdate = () => {
        console.log("[Blockchain] Refreshing holdings after purchase...");
        scanUserTokens();
    };
    window.addEventListener("rwa-holdings-update", handleUpdate);
    return () => window.removeEventListener("rwa-holdings-update", handleUpdate);
  }, [address, lands, publicClient]);

  const parseLocation = (locStr: string) => {
    try {
      const parsed = JSON.parse(locStr);
      return { address: parsed.address || locStr, lat: parsed.lat, lng: parsed.lng };
    } catch {
      return { address: locStr, lat: null, lng: null };
    }
  };

  return (
    <AuthGuard>
      <ParticleBackground />

      <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "800", color: "white", marginBottom: "10px" }}>Available Lands</h1>
          <p style={{ color: "#94a3b8", fontSize: "18px" }}>Explore and invest in high-quality real estate assets tokenized on-chain.</p>
        </div>

        {!(kycStatus === "VERIFIED" || kycStatus === "APPROVED") && (
          <div style={{ background: kycStatus === "PENDING" ? "rgba(59, 130, 246, 0.1)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${kycStatus === "PENDING" ? "#3b82f6" : "#ef4444"}`, borderRadius: "12px", padding: "20px", marginBottom: "30px", display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ color: kycStatus === "PENDING" ? "#3b82f6" : "#ef4444", fontSize: "24px" }}>{kycStatus === "PENDING" ? "⏳" : "⚠️"}</div>
            <div>
              <h4 style={{ color: "white", margin: 0 }}>{kycStatus === "PENDING" ? "KYC Under Review" : "KYC Verification Required"}</h4>
              <p style={{ color: "#94a3b8", margin: "5px 0 0 0", fontSize: "14px" }}>
                {kycStatus === "PENDING"
                  ? "Your KYC is currently under review by our team. You'll be able to buy land once verified."
                  : <>You must complete your KYC verification to buy tokens. <a href="/kyc" style={{ color: "#4ade80", fontWeight: "600", textDecoration: "none" }}>Complete KYC now →</a></>}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}>
            <div className="loader">Loading properties...</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "30px", alignItems: "stretch" }}>
            {lands.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px", background: "rgba(255,255,255,0.02)", borderRadius: "20px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ color: "#64748b", fontSize: "18px" }}>No verified properties available at the moment.</p>
              </div>
            ) : (
              lands.filter(land => (land as any).ownerId !== currentUserId).map((land) => {
                const loc = parseLocation(land.location);
                return (
                  <div 
                    key={land.id} 
                    className="property-card"
                    onClick={() => window.location.href = `/property/${land.id}`}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Map Overlay Section */}
                    <div className="map-container">
                      {loc.lat && loc.lng ? (
                        <iframe
                          src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=k&z=17&output=embed`}
                          className="map-frame"
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>🗺️</div>
                      )}
                      <div className="card-badge">VERIFIED ASSET</div>
                    </div>

                    <div className="card-content">
                      <div className="card-header">
                        <h3 className="card-title">{land.title}</h3>
                      </div>

                      <div className="location-row">
                        <span className="location-text" title={loc.address}>📍 {loc.address}</span>
                      </div>

                      <div className="info-grid">
                        <div className="info-box">
                          <span style={{ display: "block", color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Valuation</span>
                          <span style={{ color: "#4ade80", fontWeight: "700", fontSize: "15px" }}>{land.price.toLocaleString()} RWA</span>
                        </div>
                        <div className="info-box">
                          <span style={{ display: "block", color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>Unit Price</span>
                          <span style={{ color: "white", fontWeight: "600", fontSize: "15px" }}>{(land.price / (land.totalTokens || 1000)).toLocaleString()} RWA</span>
                        </div>
                      </div>

                      {userHoldings[land.id] > 0 && (
                        <div style={{ marginTop: "15px", padding: "10px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "10px", textAlign: "center", border: "1px dashed #10b981", color: "#10b981", fontSize: "12px", fontWeight: "bold" }}>
                          MY HOLDINGS: {userHoldings[land.id]} UNITS
                        </div>
                      )}

                      <div style={{ marginTop: "auto", paddingTop: "20px", color: "#7c3aed", fontWeight: "bold", fontSize: "14px", textAlign: "center" }}>
                        View Detailed Dossier →
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedLandToBuy && (
        <BuyLandModal land={selectedLandToBuy} onClose={() => setSelectedLandToBuy(null)} />
      )}

      <style jsx>{`
        .property-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
  height: 100%;
}

.property-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5),
              0 0 25px rgba(124, 58, 237, 0.2);
  border-color: rgba(124, 58, 237, 0.4);
}

/* Map container fix */
.map-container {
  height: 200px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.map-container iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Content spacing */
.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

/* Title + badge */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: white;
}

/* Location row */
.location-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
  gap: 8px;
  width: 100%;
  overflow: hidden;
}

.location-text {
  flex: 1;
  min-width: 0; /* Crucial for flex ellipsis */
  color: #94a3b8;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Info grid */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.info-box {
  background: rgba(255,255,255,0.04);
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
}

.owner-box {
  grid-column: span 2;
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.15);
}

/* Button fix */
.invest-btn {
  margin-top: auto;
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.25s ease;
}

.invest-btn:hover {
  transform: scale(1.03);
  filter: brightness(1.1);
}

/* Loader */
.loader {
  color: white;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.loader::after {
  content: "";
  width: 18px;
  height: 18px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive grid improvement */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
      `}</style>
    </AuthGuard>
  );
}
