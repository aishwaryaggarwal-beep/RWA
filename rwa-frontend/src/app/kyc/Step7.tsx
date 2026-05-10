import { useAccount, useSignMessage } from "wagmi";
import { useState } from "react";

export default function Step7({ formData, setFormData, next, back }: any) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    try {
      setLoading(true);
      const message = `I confirm ownership of the wallet address ${address} and agree to the KYC verification process for RWA Platform. Timestamp: ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ message });
      setFormData({ ...formData, walletSignature: signature });
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const isValid = formData.walletSignature;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Wallet Verification</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <div style={{ padding: "20px", background: "rgba(124, 58, 237, 0.1)", borderRadius: "16px", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
          <label style={{ fontSize: "12px", color: "#a78bfa", marginBottom: "10px", display: "block", fontWeight: "bold" }}>CONNECTED WALLET</label>
          <div style={{ fontSize: "16px", color: "white", wordBreak: "break-all", fontFamily: "monospace" }}>{address}</div>
        </div>

        <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0, lineHeight: "1.6" }}>
          To complete your KYC, please sign a secure message using your connected wallet. This proves you have full control over the account without requiring any gas fees.
        </p>

        {!formData.walletSignature ? (
          <button 
            className="btn" 
            onClick={handleSign} 
            disabled={loading}
            style={{ padding: "20px", fontSize: "16px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", borderRadius: "14px" }}
          >
            {loading ? "⏳ Check Wallet..." : "✒️ Sign Verification Message"}
          </button>
        ) : (
          <div style={{ padding: "20px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "16px", border: "1px solid rgba(34, 197, 94, 0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>✅</div>
            <div style={{ color: "#4ade80", fontWeight: "bold" }}>Wallet Verified Successfully</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "10px", wordBreak: "break-all" }}>Signature: {formData.walletSignature.slice(0, 40)}...</div>
          </div>
        )}

        <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
          <button onClick={back} style={{ width: "50px", height: "50px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ←
          </button>

          <button disabled={!isValid} onClick={next} style={{ flex: 1, padding: "14px", borderRadius: "12px", fontWeight: "bold", border: "none", color: "white", background: isValid ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(100, 116, 139, 0.5)", cursor: isValid ? "pointer" : "not-allowed", opacity: isValid ? 1 : 0.7 }}>
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
