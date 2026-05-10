export default function Step3({ formData, setFormData, next, back }: any) {
  const isIndian = formData.country === "India" || formData.nationality === "India";
  const isValid = formData.documentType && 
                 (formData.documentType === "PAN" ? formData.panNumber : formData.aadhaarNumber) &&
                 formData.documentFront && 
                 (formData.documentType === "PAN" ? true : formData.documentBack);


  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Identity Verification</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <div>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Document Type</label>
          <select value={formData.documentType} onChange={(e) => setFormData({ ...formData, documentType: e.target.value })} className="input" style={{ width: "100%", background: "#0f172a" }}>
            <option value="PAN">PAN Card</option>
            <option value="Aadhaar">Aadhaar Card</option>
            <option value="Passport">Passport</option>
            <option value="VoterID">Voter ID</option>
          </select>
        </div>

        {formData.documentType === "PAN" && (
          <input placeholder="PAN Number (e.g. ABCDE1234F)" className="input" value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })} />
        )}

        {formData.documentType === "Aadhaar" && (
          <input placeholder="Aadhaar Number (12 Digits)" className="input" value={formData.aadhaarNumber} onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })} />
        )}

        <div style={{ display: "flex", gap: "15px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Front of ID</label>
            <input type="file" className="input" onChange={(e: any) => setFormData({ ...formData, documentFront: e.target.files[0] })} />
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{formData.documentFront?.name}</span>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>
              Back of ID {formData.documentType === "PAN" && "(Optional)"}
            </label>
            <input type="file" className="input" onChange={(e: any) => setFormData({ ...formData, documentBack: e.target.files[0] })} />
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{formData.documentBack?.name}</span>
          </div>

        </div>

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