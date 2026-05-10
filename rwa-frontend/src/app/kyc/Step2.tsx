export default function Step2({ formData, setFormData, next, back }: any) {
    const isValid = formData.country && formData.state && formData.city && formData.pincode && formData.fullAddress && formData.taxResidency;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Address Details</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <div style={{ display: "flex", gap: "15px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Country</label>
          <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="input" style={{ width: "100%", background: "#0f172a" }}>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="UAE">UAE</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>State / Province</label>
          <input placeholder="Maharashtra" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="input" style={{ width: "100%" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px" }}>
        <input placeholder="City" className="input" style={{ flex: 1 }} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
        <input placeholder="Postal Code" className="input" style={{ flex: 1 }} value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
      </div>

      <textarea placeholder="Full Residential Address" className="input" style={{ minHeight: "80px", paddingTop: "12px", resize: "none" }} value={formData.fullAddress} onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })} />

      <div>
        <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Tax Residency Country</label>
        <select value={formData.taxResidency} onChange={(e) => setFormData({ ...formData, taxResidency: e.target.value })} className="input" style={{ width: "100%", background: "#0f172a" }}>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="UAE">UAE</option>
        </select>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#e2e8f0" }}>
        <input type="checkbox" checked={formData.permanentSameAsCurrent} onChange={(e) => setFormData({ ...formData, permanentSameAsCurrent: e.target.checked })} />
        Permanent address same as current address
      </label>

      <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
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