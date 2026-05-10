export default function Step4({ formData, setFormData, next, back }: any) {
  const isValid = formData.occupation && formData.employerName && formData.annualIncome && formData.experience;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Investor Profile</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <input placeholder="Occupation" className="input" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} />
        <input placeholder="Employer / Business Name" className="input" value={formData.employerName} onChange={(e) => setFormData({ ...formData, employerName: e.target.value })} />

        <div>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Annual Income Range</label>
          <select value={formData.annualIncome} onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })} className="input" style={{ width: "100%", background: "#0f172a" }}>
            <option value="">Select Range</option>
            <option value="Under $50k">Under $50,000</option>
            <option value="$50k - $100k">$50,000 - $100,000</option>
            <option value="$100k - $250k">$100,000 - $250,000</option>
            <option value="Over $250k">Over $250,000</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Investment Experience</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["Beginner", "Intermediate", "Advanced"].map((exp) => (
              <button 
                key={exp}
                onClick={() => setFormData({ ...formData, experience: exp })}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: formData.experience === exp ? "#3b82f6" : "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "12px" }}
              >
                {exp}
              </button>
            ))}
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