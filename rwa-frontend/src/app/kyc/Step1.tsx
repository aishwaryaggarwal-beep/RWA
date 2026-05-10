export default function Step1({ formData, setFormData, next }: any) {
    const isAtLeast18 = (dob: string) => {
        if (!dob) return false;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 18;
    };

    const dobValid = isAtLeast18(formData.dob);
    const isValid = formData.firstName && formData.lastName && formData.dob && dobValid && formData.nationality && formData.mobile && formData.email;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Basic Profile</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <div style={{ display: "flex", gap: "15px" }}>
        <input placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input" style={{ flex: 1 }} />
        <input placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input" style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Date of Birth</label>
          <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="input" style={{ width: "100%", borderColor: formData.dob && !dobValid ? "#ef4444" : "rgba(255,255,255,0.1)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Gender</label>
          <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="input" style={{ width: "100%", background: "#0f172a" }}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      
      {formData.dob && !dobValid && (
        <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "-15px" }}>⚠️ You must be at least 18 years old.</p>
      )}

      <div style={{ display: "flex", gap: "15px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Nationality</label>
          <select value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} className="input" style={{ width: "100%", background: "#0f172a" }}>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="UAE">UAE</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "5px", display: "block" }}>Mobile Number</label>
          <input placeholder="+91 9876543210" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="input" style={{ width: "100%" }} />
        </div>
      </div>

      <input placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" />

      <button className="btn" onClick={next} disabled={!isValid} style={{ marginTop: "10px", width: "100%", padding: "14px", borderRadius: "12px", fontWeight: "bold", background: isValid ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(100, 116, 139, 0.5)", cursor: isValid ? "pointer" : "not-allowed", opacity: isValid ? 1 : 0.7 }}>
        Next Step
      </button>

      </div>
    </div>
  );
}