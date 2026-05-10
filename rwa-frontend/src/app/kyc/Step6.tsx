export default function Step6({ formData, setFormData, next, back }: any) {
  const isValid = true; // Booleans are always valid in this case (user can say yes or no)

  const Toggle = ({ label, value, field }: any) => (
    <div style={{ padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "15px", fontWeight: "600", color: "#e2e8f0" }}>{label}</span>
        <button 
          onClick={() => setFormData({ ...formData, [field]: !value })}
          style={{ width: "50px", height: "26px", borderRadius: "13px", background: value ? "#3b82f6" : "#334155", border: "none", cursor: "pointer", position: "relative", transition: "all 0.3s" }}
        >
          <div style={{ position: "absolute", top: "3px", left: value ? "27px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "white", transition: "all 0.3s" }} />
        </button>
      </div>
      <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: "1.5" }}>
        {field === 'isPEP' && "A Politically Exposed Person (PEP) is someone who has been entrusted with a prominent public function, such as a senior politician, judge, or military officer."}
        {field === 'actingForOthers' && "Are you completing this verification for yourself or on behalf of another individual or legal entity?"}
        {field === 'isBeneficialOwner' && "A beneficial owner is the person who ultimately owns or controls the funds being invested."}
      </p>
    </div>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Compliance Screening</h3>
      <div style={{ display: "flex", flexDirection: "column" }}>
        
        <Toggle label="Are you a Politically Exposed Person (PEP)?" value={formData.isPEP} field="isPEP" />
        <Toggle label="Are you acting on behalf of someone else?" value={formData.actingForOthers} field="actingForOthers" />
        <Toggle label="Are you the beneficial owner of these funds?" value={formData.isBeneficialOwner} field="isBeneficialOwner" />

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
