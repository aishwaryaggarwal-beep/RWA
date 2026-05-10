"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import ParticleBackground from "@/src/components/ParticleBackground";
import { API_URL } from "@/src/lib/api";
import { useAccount, useSignMessage, useChainId, useSwitchChain } from "wagmi";
import dynamic from "next/dynamic";
import ListLandModal from "@/src/components/ListLandModal";

const MapPicker = dynamic(() => import("@/src/components/MapPicker"), { ssr: false });

export default function SellLand() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const { signMessageAsync } = useSignMessage();

    const [step, setStep] = useState(1);
    const [isVerified, setIsVerified] = useState(false);
    const [kycStatus, setKycStatus] = useState("NOT_SUBMITTED");
    const [checking, setChecking] = useState(true);
    const [user, setUser] = useState<any>(null);

    const [activeTab, setActiveTab] = useState("HISTORY"); // "HISTORY", "UNDER_REVIEW", "NEW_LISTING"
    const [myLands, setMyLands] = useState<any[]>([]);
    const [loadingLands, setLoadingLands] = useState(true);
    const [selectedLandToList, setSelectedLandToList] = useState<any | null>(null);

    const [form, setForm] = useState({
        title: "",
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        lat: null as number | null,
        lng: null as number | null,
        propertyType: "Agricultural",
        area: "",
        price: "",
        description: "",
        // 📈 Tokenization & Financials
        tokenName: "", // e.g. "Heritage-H-1"
        totalTokens: "1000", // Default fractional units
        minPurchase: "10",   // Min fractions to buy
        annualRevenue: "",
        maintenanceCosts: "",
        expectedYield: "",
        // 📄 Legal
        deedCid: "",
        taxReportCid: ""
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setKycStatus(user.kycStatus || "NOT_SUBMITTED");
        setIsVerified(user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED");
        setUser(user);

        const fetchData = async () => {
          try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Fetch KYC
            const resKyc = await fetch("http://127.0.0.1:3001/kyc/status", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resKyc.ok) {
              const { status } = await resKyc.json();
              setKycStatus(status);
              setIsVerified(status === "VERIFIED" || status === "APPROVED");
              user.kycStatus = status;
              localStorage.setItem("user", JSON.stringify(user));
            }

            // Fetch Lands
            const resLands = await fetch("http://127.0.0.1:3001/land/my", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resLands.ok) {
              setMyLands(await resLands.json());
            }
          } catch (err) {
            console.error("Failed to fetch dashboard data", err);
          } finally {
            setChecking(false);
            setLoadingLands(false);
          }
        };
        fetchData();
    }, []);
    
    // 📈 Sync expected yield dynamically
    useEffect(() => {
        const p = parseFloat(form.price);
        const r = parseFloat(form.annualRevenue);
        const m = parseFloat(form.maintenanceCosts);
        if (p > 0 && !isNaN(r) && !isNaN(m)) {
            const yieldVal = (((r - m) / p) * 100).toFixed(2);
            if (form.expectedYield !== yieldVal) {
                setForm(prev => ({ ...prev, expectedYield: yieldVal }));
            }
        }
    }, [form.price, form.annualRevenue, form.maintenanceCosts, form.expectedYield]);

    const [uploading, setUploading] = useState<string | null>(null);

    const handleFileChange = async (e: any, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(field);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API_URL}/land/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.cid) {
                setForm(prev => ({ ...prev, [field]: data.cid }));
                console.log(`[RWA] Document [${field}] vaulted successfully: ${data.cid}`);
            } else {
                alert("Decentralized upload failed: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Upload error", err);
            alert("Connection error during upload.");
        } finally {
            setUploading(null);
        }
    };

    const handleSignAndSubmit = async () => {
        if (!form.title || !form.street || !form.city || !form.state || !form.country || !form.zipCode || !form.price || !form.area || !form.tokenName) {
            alert("All primary property fields, full address, and Token Symbol are required.");
            return;
        }
        
        if (!address) {
            alert("Please connect your Web3 wallet to sign the listing.");
            return;
        }

        try {
            // Check if on correct chain (Amoy - 80002)
            if (chainId !== 80002) {
                try {
                    await switchChainAsync({ chainId: 80002 });
                } catch (err) {
                    alert("Please switch your wallet to Polygon Amoy to sign this property listing.");
                    return;
                }
            }
            const messagePayload = `I verify my intent to list this property on RWA Protocol.\n\nTitle: ${form.title}\nArea: ${form.area} sq ft\nLocation: ${form.street}, ${form.city}\nWallet: ${address}`;
            const signature = await signMessageAsync({ message: messagePayload });
            
            handleSubmit(signature, address, messagePayload);
        } catch (err) {
            console.error("Signature failed", err);
            alert("Transaction signing was rejected or failed.");
        }
    };

    const handleSubmit = async (signature: string, walletAddress: string, messagePayload: string) => {

        const fullAddress = `${form.street}, ${form.city}, ${form.state}, ${form.country} ${form.zipCode}`.trim();
        // Stringify the complex location to store in standard String DB field
        const locationPayload = JSON.stringify({
           address: fullAddress,
           street: form.street,
           city: form.city,
           state: form.state,
           country: form.country,
           zipCode: form.zipCode,
           lat: form.lat,
           lng: form.lng
        });

        const res = await fetch(`${API_URL}/land/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ 
                ...form, 
                location: locationPayload,
                signature,
                walletAddress,
                messagePayload
            }),
        });

        const data = await res.json();
        if (res.ok) {
            alert("Property Onboarding Complete! 🏠 Our forensic auditors will now review the asset details.");
            window.location.reload(); // Reload dashboard to show pending asset
        } else {
            alert(data.message || "Onboarding Failed");
        }
    };

    const renderStepTracker = () => (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= s ? '#22c55e' : 'rgba(255,255,255,0.1)', transition: '0.3s' }} />
            ))}
        </div>
    );

    const historyLands = myLands.filter(l => l.status === "VERIFIED" || l.status === "LISTED" || l.status === "REJECTED");
    const reviewLands = myLands.filter(l => l.status === "PENDING" || (!l.isVerified && l.status !== "REJECTED"));

    const parseLocation = (locStr: string) => {
        try {
            const loc = JSON.parse(locStr);
            return loc.address || locStr;
        } catch {
            return locStr;
        }
    };

    const renderLandGrid = (lands: any[]) => {
        if (loadingLands) return <p style={{ color: "#94a3b8" }}>Loading assets...</p>;
        if (lands.length === 0) return <p style={{ color: "#94a3b8", padding: "20px 0" }}>No assets found in this category.</p>;

        return (
            <div className="land-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginTop: "20px" }}>
                {lands.map((land) => (
                    <div key={land.id} className="land-card" style={{ background: "rgba(255,255,255,0.03)", borderRadius: "15px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, right: 0, background: (land.status === "VERIFIED" || land.status === "LISTED") ? "rgba(34, 197, 94, 0.2)" : land.status === "REJECTED" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", color: (land.status === "VERIFIED" || land.status === "LISTED") ? "#4ade80" : land.status === "REJECTED" ? "#ef4444" : "#fbbf24", padding: "4px 10px", borderBottomLeftRadius: "10px", fontSize: "10px", fontWeight: "bold" }}>
                            {land.status}
                        </div>
                        <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "10px", marginTop: "5px" }}>{land.title}</h4>
                        <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>Location: <span style={{ color: "white" }}>{parseLocation(land.location)}</span></div>
                        <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>Area: <span style={{ color: "white" }}>{land.area} sq ft</span></div>
                        <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "15px" }}>Value: <span style={{ color: "#4ade80", fontWeight: "bold" }}>{land.price.toLocaleString()} RWA</span></div>
                        
                        {land.status === "VERIFIED" && (
                             <button 
                                onClick={() => setSelectedLandToList(land)}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", outline: "none", border: "none", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }}
                             >
                                List on Marketplace
                             </button>
                        )}
                        {land.status === "LISTED" && (
                            <div style={{ textAlign: "center", padding: "10px", color: "#4ade80", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.2)", fontSize: "13px", fontWeight: "600" }}>
                                ✓ Active on Marketplace
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <AuthGuard>
            <ParticleBackground />
            <div style={{ position: 'relative', zIndex: 1, padding: "40px 20px", minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: "1200px", minHeight: "80vh", transition: "max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)", background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "50px", marginTop: "20px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
                    
                    {!isVerified ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>{kycStatus === "PENDING" ? "⏳" : "🛡️"}</div>
                            <h2 style={{ fontSize: "28px", fontWeight: "800" }}>{kycStatus === "PENDING" ? "Onboarding Paused" : "Identity Blocked"}</h2>
                            <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: "16px", lineHeight: "1.6" }}>
                                {kycStatus === "PENDING" 
                                    ? "Your identity is being verified. Property listing powers will be unlocked the moment forensic analysis completes."
                                    : "Asset listing is a high-permission feature. You must complete your biometric identity verification before onboarding real-world property."}
                            </p>
                            {kycStatus !== "PENDING" && (
                                 <button onClick={() => window.location.href='/kyc'} className="btn" style={{ padding: "14px 40px", fontWeight: "900", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "8px", color: "white" }}>Complete KYC</button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Secondary Navbar */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "20px", marginBottom: "30px" }}>
                                <div style={{ display: "flex", gap: "30px" }}>
                                    <button 
                                        onClick={() => setActiveTab("HISTORY")} 
                                        style={{ background: "transparent", border: "none", color: activeTab === "HISTORY" ? "white" : "#64748b", fontWeight: activeTab === "HISTORY" ? "bold" : "normal", fontSize: "16px", cursor: "pointer", borderBottom: activeTab === "HISTORY" ? "2px solid #10b981" : "2px solid transparent", paddingBottom: "20px", marginBottom: "-21px" }}
                                    >
                                        My Properties
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab("UNDER_REVIEW")} 
                                        style={{ background: "transparent", border: "none", color: activeTab === "UNDER_REVIEW" ? "white" : "#64748b", fontWeight: activeTab === "UNDER_REVIEW" ? "bold" : "normal", fontSize: "16px", cursor: "pointer", borderBottom: activeTab === "UNDER_REVIEW" ? "2px solid #10b981" : "2px solid transparent", paddingBottom: "20px", marginBottom: "-21px" }}
                                    >
                                        Under Review
                                    </button>
                                </div>
                                
                                {activeTab !== "NEW_LISTING" && (
                                     <button 
                                        onClick={() => { setActiveTab("NEW_LISTING"); setStep(1); }} 
                                        style={{ padding: "10px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", outline: "none", border: "none", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }}
                                    >
                                        + List New Asset
                                    </button>
                                )}
                            </div>

                            {/* Views */}
                            {activeTab === "HISTORY" && (
                                <div>
                                    <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "white" }}>Verified Assets</h3>
                                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>These properties have successfully passed the forensic audit and are tokenized.</p>
                                    {renderLandGrid(historyLands)}
                                </div>
                            )}

                            {activeTab === "UNDER_REVIEW" && (
                                <div>
                                    <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "white" }}>Pending Audits</h3>
                                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>These properties are currently being verified by our forensic team.</p>
                                    {renderLandGrid(reviewLands)}
                                </div>
                            )}

                            {activeTab === "NEW_LISTING" && (
                                <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "8px" }}>
                                        <h2 style={{ fontSize: "24px", fontWeight: "900", background: "linear-gradient(90deg, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Onboard Asset</h2>
                                        <button onClick={() => setActiveTab("HISTORY")} style={{ background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontSize: "24px" }} title="Cancel Onboarding">✕</button>
                                    </div>
                                    <p style={{ color: "#64748b", marginBottom: "20px", fontWeight: "500" }}>Tokenize your real estate on the blockchain.</p>

                                    {/* 🔐 Wallet Information Banner */}
                                    <div style={{ background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "12px", padding: "15px", marginBottom: "25px", display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ fontSize: "20px" }}>🛡️</div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: "12px", color: "#6ee7b7", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Registered Signing Wallet</p>
                                            <p style={{ margin: 0, fontSize: "14px", color: "white", fontFamily: "monospace" }}>{user?.walletAddress || "No wallet registered"}</p>
                                            {address?.toLowerCase() !== user?.walletAddress?.toLowerCase() && (
                                                <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: "#ef4444", fontWeight: "bold" }}>
                                                    ⚠️ Mismatch: You are currently connected with {address?.slice(0,6)}...{address?.slice(-4)}. Please switch to your registered wallet.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {renderStepTracker()}

                                    {step === 1 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <h4 style={{ color: "#10b981", fontWeight: "800", textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px" }}>Step 1: Property Intel</h4>
                                            <input className="input" placeholder="Property Title (e.g., Highland Ranch)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                            
                                            <div style={{ background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                                <label style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px", display: "block" }}>Property Location & Coordinates</label>
                                                
                                                <input className="input" placeholder="Street Address (e.g. 123 Main St)" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                                                
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <input className="input" style={{ flex: 1 }} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                                                    <input className="input" style={{ flex: 1 }} placeholder="State / Province" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                                                </div>

                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <input className="input" style={{ flex: 1 }} placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                                                    <input className="input" style={{ flex: 1 }} placeholder="Zip / Postal Code" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
                                                </div>

                                                <div style={{ marginTop: '10px' }}>
                                                    <label style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Pinpoint exactly on map</label>
                                                    <MapPicker onLocationSelect={(lat, lng) => setForm({ ...form, lat, lng })} />
                                                </div>
                                                
                                                {form.lat && <p style={{ fontSize: "11px", color: "#10b981", marginTop: "10px", textAlign: "right" }}>📍 Locked: {form.lat.toFixed(4)}, {form.lng?.toFixed(4)}</p>}
                                            </div>

                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <select className="input" style={{ flex: 1, background: "#0f172a" }} value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                                                    <option>Agricultural</option>
                                                    <option>Residential</option>
                                                    <option>Commercial</option>
                                                    <option>Industrial</option>
                                                </select>
                                                <input type="number" className="input" style={{ flex: 1 }} placeholder="Size (Sq Ft)" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                                            </div>
                                            <textarea className="input" placeholder="Brief history and features of the asset..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                            <button className="btn" onClick={() => setStep(2)}>Next: Financial Details →</button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <h4 style={{ color: "#10b981", fontWeight: "800", textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px" }}>Step 2: Tokenization & Financials</h4>
                                            
                                            <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(59, 130, 246, 0.1)", marginBottom: "5px" }}>
                                                <label style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "bold", marginBottom: "10px", display: "block" }}>On-Chain Identity</label>
                                                <input className="input" placeholder="Asset Token Symbol (e.g. WOOD-1)" value={form.tokenName} onChange={(e) => setForm({ ...form, tokenName: e.target.value })} />
                                                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: "10px", color: "#94a3b8" }}>Total Fractional Supply</label>
                                                        <input type="number" className="input" placeholder="e.g. 1000" value={form.totalTokens} onChange={(e) => setForm({ ...form, totalTokens: e.target.value })} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: "10px", color: "#94a3b8" }}>Min purchase bits</label>
                                                        <input type="number" className="input" placeholder="e.g. 10" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "10px" }}>Market Valuation (RWA)</label>
                                                <input type="number" className="input" placeholder="Market Appraisal Price (RWA)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                                            </div>

                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: "11px", color: "#64748b", marginLeft: "10px" }}>Annual Rent (RWA)</label>
                                                    <input type="number" className="input" placeholder="e.g. 500000" value={form.annualRevenue} onChange={(e) => setForm({ ...form, annualRevenue: e.target.value })} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: "11px", color: "#64748b", marginLeft: "10px" }}>OpEx (RWA)</label>
                                                    <input type="number" className="input" placeholder="e.g. 50000" value={form.maintenanceCosts} onChange={(e) => setForm({ ...form, maintenanceCosts: e.target.value })} />
                                                </div>
                                            </div>

                                            <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "20px", borderRadius: "12px", border: "1px dashed rgba(16, 185, 129, 0.2)" }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Token Yield Forecast</span>
                                                    <span style={{ fontSize: '15px', color: '#10b981', fontWeight: 'bold' }}>
                                                        {(() => {
                                                            const p = parseFloat(form.price);
                                                            const r = parseFloat(form.annualRevenue);
                                                            const m = parseFloat(form.maintenanceCosts);
                                                            if (p > 0 && !isNaN(r) && !isNaN(m)) {
                                                                const yieldVal = ((r - m) / p) * 100;
                                                                return `~${yieldVal.toFixed(2)}%`;
                                                            }
                                                            return "0.00%";
                                                        })()}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Price Per Token</span>
                                                    <span style={{ fontSize: '15px', color: '#60a5fa', fontWeight: 'bold' }}>
                                                        {(() => {
                                                            const p = parseFloat(form.price);
                                                            const t = parseInt(form.totalTokens);
                                                            if (p > 0 && t > 0) {
                                                                return `${(p / t).toLocaleString()} RWA`;
                                                            }
                                                            return "0 RWA";
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <button className="btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: "white" }} onClick={() => setStep(1)}>← Back</button>
                                                <button className="btn" style={{ flex: 2 }} onClick={() => setStep(3)}>Next: Legal Vault →</button>
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <h4 style={{ color: "#10b981", fontWeight: "800", textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px" }}>Step 3: Legal Documentation</h4>
                                            <div style={{ padding: "20px", border: form.deedCid ? "2px solid #22c55e" : "2px dashed rgba(255,255,255,0.1)", borderRadius: "15px", textAlign: "center", background: form.deedCid ? "rgba(34, 197, 94, 0.05)" : "transparent" }}>
                                                <p style={{ fontSize: "14px", color: form.deedCid ? "#22c55e" : "#94a3b8" }}>{form.deedCid ? "✅ Property Deed Vaulted" : "Upload Property Deed (PDF)"}</p>
                                                <input type="file" style={{ display: "none" }} id="deed-upload" onChange={(e) => handleFileChange(e, 'deedCid')} disabled={!!uploading} />
                                                <label htmlFor="deed-upload" style={{ color: "#10b981", cursor: uploading ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                                    {uploading === 'deedCid' ? "Vaulting to IPFS... ⏳" : form.deedCid ? "Reselect →" : "Select File"}
                                                </label>
                                                {form.deedCid && !uploading && <p style={{ fontSize: "10px", color: "#64748b", marginTop: "5px" }}>CID: {form.deedCid}</p>}
                                            </div>
                                            <div style={{ padding: "20px", border: form.taxReportCid ? "2px solid #22c55e" : "2px dashed rgba(255,255,255,0.1)", borderRadius: "15px", textAlign: "center", background: form.taxReportCid ? "rgba(34, 197, 94, 0.05)" : "transparent" }}>
                                                <p style={{ fontSize: "14px", color: form.taxReportCid ? "#22c55e" : "#94a3b8" }}>{form.taxReportCid ? "✅ Tax Records Vaulted" : "Tax Records & Title Insurance"}</p>
                                                <input type="file" style={{ display: "none" }} id="tax-upload" onChange={(e) => handleFileChange(e, 'taxReportCid')} disabled={!!uploading} />
                                                <label htmlFor="tax-upload" style={{ color: "#10b981", cursor: uploading ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                                    {uploading === 'taxReportCid' ? "Vaulting to IPFS... ⏳" : form.taxReportCid ? "Reselect →" : "Select File"}
                                                </label>
                                                {form.taxReportCid && !uploading && <p style={{ fontSize: "10px", color: "#64748b", marginTop: "5px" }}>CID: {form.taxReportCid}</p>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '15px', marginTop: "10px" }}>
                                                <button className="btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: "white" }} onClick={() => setStep(2)}>← Back</button>
                                                <button className="btn" style={{ flex: 2, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} onClick={handleSignAndSubmit}>Sign & Initialize 🔐</button>
                                            </div>
                                            <p style={{ fontSize: "10px", color: "#64748b", textAlign: "center" }}>By initializing, you agree to our RWA fractionalization standards and forensic audit terms.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {selectedLandToList && (
                <ListLandModal land={selectedLandToList} onClose={() => setSelectedLandToList(null)} />
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </AuthGuard>
    );
}