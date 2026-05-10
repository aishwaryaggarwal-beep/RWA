import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Step8({ formData, setFormData, back }: any) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isValid = formData.agreedToTerms && formData.confirmedAccuracy && formData.notRestricted;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      
      const data = new FormData();
      
      // 🗺️ Map frontend keys to backend expected names
      const mappedData: any = {
        ...formData,
        address: formData.fullAddress,
        documentIdNumber: 
          formData.documentType === "PAN" ? formData.panNumber : 
          formData.documentType === "Aadhaar" ? formData.aadhaarNumber :
          formData.documentType === "Passport" ? formData.passportNumber :
          formData.documentType === "VoterID" ? formData.voterIdNumber : 
          formData.idNumber, // fallback

        employer: formData.employerName,
        incomeRange: formData.annualIncome,
        isPep: formData.isPEP,
        walletProofSignature: formData.walletSignature
      };

      // Append all text fields
      Object.keys(mappedData).forEach(key => {
        if (!(mappedData[key] instanceof File) && mappedData[key] !== undefined && mappedData[key] !== null) {
          data.append(key, mappedData[key]);
        }
      });

      // Append Files
      if (formData.documentFront) data.append("documentFront", formData.documentFront);
      if (formData.documentBack) data.append("documentBack", formData.documentBack);
      if (formData.selfieFile) data.append("selfieFile", formData.selfieFile);


      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/kyc`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Submission failed");
      }

      const result = await res.json();
      console.log("KYC Submitted:", result);
      
      // Update local storage status
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.kycStatus = result.status || "PENDING";
      localStorage.setItem("user", JSON.stringify(user));

      // 🧹 Clear KYC draft data from session storage
      sessionStorage.removeItem("kyc_draft");
      sessionStorage.removeItem("kyc_step");

      router.push("/dashboard?kyc=success");
      
    } catch (e: any) {
      console.error("[KYC_SUBMIT_ERROR]", e);
      // Clean up the error message if it's a Prisma error
      let msg = e.message;
      if (msg.includes("Invalid `prisma.kYC.create()`")) {
        msg = "A database error occurred during submission. This usually means some required fields were missing or incorrectly formatted. Please check your address and document details.";
      }
      alert("Submission Error: " + msg);
      setSubmitting(false);
    }

  };


  const Checkbox = ({ label, field }: any) => (
    <label style={{ display: "flex", gap: "15px", padding: "15px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", marginBottom: "12px" }}>
      <input 
        type="checkbox" 
        checked={formData[field]} 
        onChange={(e) => setFormData({ ...formData, [field]: e.target.checked })}
        style={{ width: "20px", height: "20px", marginTop: "2px" }}
      />
      <span style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: "1.5" }}>{label}</span>
    </label>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Final Agreements</h3>
      <div style={{ display: "flex", flexDirection: "column" }}>
        
        <Checkbox label="I confirm that all information provided is accurate and truthful to the best of my knowledge." field="confirmedAccuracy" />
        <Checkbox label="I confirm that I am the beneficial owner of the funds being used for investment on this platform." field="isBeneficialOwner" />
        <Checkbox label="I agree to the Terms & Conditions and Privacy Policy of the RWA Platform." field="agreedToTerms" />
        <Checkbox label="I confirm that I am not a citizen or resident of any restricted jurisdiction (e.g. North Korea, Iran, etc.)." field="notRestricted" />

        <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
          <button onClick={back} disabled={submitting} style={{ width: "50px", height: "50px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "20px", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ←
          </button>

          <button 
            disabled={!isValid || submitting} 
            onClick={handleSubmit} 
            style={{ flex: 1, padding: "14px", borderRadius: "12px", fontWeight: "bold", border: "none", color: "white", background: isValid ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(100, 116, 139, 0.5)", cursor: (isValid && !submitting) ? "pointer" : "not-allowed", opacity: isValid ? 1 : 0.7 }}
          >
            {submitting ? "⏳ Processing Submission..." : "🚀 Submit KYC Verification"}
          </button>
        </div>
        
        {submitting && (
          <p style={{ textAlign: "center", color: "#4ade80", fontSize: "14px", marginTop: "20px", fontWeight: "bold" }}>
            Encrypting and uploading your documents to secure storage...
          </p>
        )}
      </div>
    </div>
  );
}
