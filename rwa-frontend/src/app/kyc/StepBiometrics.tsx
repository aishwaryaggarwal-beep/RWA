import { useState, useRef } from "react";

export default function StepBiometrics({ formData, setFormData, next, back }: any) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, selfieFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isValid = formData.selfieFile !== null;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(15px)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
      <h3 style={{ fontSize: "26px", fontWeight: "700", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "15px" }}>Biometric Verification</h3>
      <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "14px", lineHeight: "1.6" }}>
        To prevent identity theft, please upload a clear selfie holding your ID card. Ensure your face is clearly visible and the document is legible.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            width: "200px", 
            height: "200px", 
            borderRadius: "50%", 
            border: "2px dashed rgba(255,255,255,0.2)", 
            display: "flex", 
            flexDirection: "column",
            alignItems: "center", 
            justifyContent: "center", 
            cursor: "pointer",
            overflow: "hidden",
            background: "rgba(255,255,255,0.02)",
            position: "relative",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
          onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
        >
          {preview ? (
            <img src={preview} alt="Selfie Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <>
              <span style={{ fontSize: "40px", marginBottom: "10px" }}>📸</span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Click to Upload Selfie</span>
            </>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
        />

        <div style={{ display: "flex", gap: "15px", marginTop: "20px", width: "100%" }}>
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
