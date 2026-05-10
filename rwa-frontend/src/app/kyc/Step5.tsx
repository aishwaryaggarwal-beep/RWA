export default function Step5({ formData, setFormData, next, back }: any) {
  const sources = [
    "Salary",
    "Business Income",
    "Investments",
    "Inheritance",
    "Property Sale",
    "Crypto Gains",
    "Other"
  ];

  const isValid = formData.sourceOfFunds;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Source of Funds</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "10px" }}>Please select the primary source of the funds you will be investing.</p>
        
        {sources.map((source) => (
          <button 
            key={source}
            onClick={() => setFormData({ ...formData, sourceOfFunds: source })}
            style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: formData.sourceOfFunds === source ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", textAlign: "left", fontSize: "14px", transition: "all 0.2s", borderColor: formData.sourceOfFunds === source ? "#3b82f6" : "rgba(255,255,255,0.1)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {formData.sourceOfFunds === source && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6" }} />}
              </div>
              {source}
            </div>
          </button>
        ))}

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
