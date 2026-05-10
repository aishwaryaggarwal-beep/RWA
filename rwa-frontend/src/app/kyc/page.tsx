"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/src/components/AuthGuard";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";
import Step6 from "./Step6";
import Step7 from "./Step7";
import StepBiometrics from "./StepBiometrics";
import Step8 from "./Step8";
import StepItem from "./StepItem";


export default function KycPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedUser?.kycStatus === "VERIFIED" || storedUser?.kycStatus === "APPROVED") {
        router.push("/dashboard");
      }
    } catch (e) { }
  }, [router]);

  const [formData, setFormData] = useState({
    // Step 1: Basic Profile
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    gender: "",
    nationality: "India",
    mobile: "",
    email: "",

    // Step 2: Address Details
    country: "India",
    state: "",
    city: "",
    pincode: "",
    fullAddress: "",
    taxResidency: "India",
    permanentSameAsCurrent: true,

    // Step 3: Identity Verification
    documentType: "PAN",
    panNumber: "",
    aadhaarNumber: "",
    documentFront: null as File | null,
    documentBack: null as File | null,

    // Step 4: Biometrics
    selfieFile: null as File | null,

    // Step 5: Investor Profile
    occupation: "",
    employerName: "",
    annualIncome: "",
    netWorth: "",
    experience: "Beginner",

    // Step 6: Source of Funds
    sourceOfFunds: "",

    // Step 7: Compliance Screening
    isPEP: false,
    actingForOthers: false,
    isBeneficialOwner: true,

    // Step 8: Wallet Verification
    walletSignature: "",

    // Step 9: Agreements
    agreedToTerms: false,
    confirmedAccuracy: false,
    notRestricted: false,
  });

  // 💾 Persistence Logic: Load from SessionStorage on Mount
  useEffect(() => {
    const savedData = sessionStorage.getItem("kyc_draft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Merge saved text data into current state (don't overwrite files)
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load KYC draft", e);
      }
    }
    
    const savedStep = sessionStorage.getItem("kyc_step");
    if (savedStep) setStep(parseInt(savedStep));
  }, []);

  // 💾 Persistence Logic: Save to SessionStorage on Change
  useEffect(() => {
    // 🛡️ SECURITY: Exclude files AND sensitive PII from session storage
    const { 
      documentFront, 
      documentBack, 
      selfieFile, 
      ...textData 
    } = formData;

    sessionStorage.setItem("kyc_draft", JSON.stringify(textData));
    sessionStorage.setItem("kyc_step", step.toString());
  }, [formData, step]);





  return (
    <AuthGuard>
      <div style={{ display: "flex", minHeight: "calc(100vh - 70px)", background: "radial-gradient(circle at top right, #1e293b, #020617)", color: "white" }}>
        <div style={{ width: "300px", padding: "50px 30px", borderRight: "1px solid rgba(255,255,255,0.08)", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(10px)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "40px", color: "#e2e8f0" }}>KYC Verification</h2>
          <StepItem title="Profile" step={1} current={step} />
          <StepItem title="Address" step={2} current={step} />
          <StepItem title="Identity" step={3} current={step} />
          <StepItem title="Biometrics" step={4} current={step} />
          <StepItem title="Investor" step={5} current={step} />
          <StepItem title="Funds" step={6} current={step} />
          <StepItem title="Compliance" step={7} current={step} />
          <StepItem title="Wallet" step={8} current={step} />
          <StepItem title="Final" step={9} current={step} />
        </div>

        <div style={{ flex: 1, padding: "60px 40px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "600px" }}>

            {step === 1 && (
              <Step1 formData={formData} setFormData={setFormData} next={() => setStep(2)} />
            )}

            {step === 2 && (
              <Step2 formData={formData} setFormData={setFormData} next={() => setStep(3)} back={() => setStep(1)} />
            )}

            {step === 3 && (
              <Step3 formData={formData} setFormData={setFormData} next={() => setStep(4)} back={() => setStep(2)} />
            )}

            {step === 4 && (
              <StepBiometrics formData={formData} setFormData={setFormData} next={() => setStep(5)} back={() => setStep(3)} />
            )}

            {step === 5 && (
              <Step4 formData={formData} setFormData={setFormData} next={() => setStep(6)} back={() => setStep(4)} />
            )}

            {step === 6 && (
              <Step5 formData={formData} setFormData={setFormData} next={() => setStep(7)} back={() => setStep(5)} />
            )}

            {step === 7 && (
              <Step6 formData={formData} setFormData={setFormData} next={() => setStep(8)} back={() => setStep(6)} />
            )}

            {step === 8 && (
              <Step7 formData={formData} setFormData={setFormData} next={() => setStep(9)} back={() => setStep(7)} />
            )}

            {step === 9 && (
              <Step8 formData={formData} setFormData={setFormData} back={() => setStep(8)} />
            )}



          </div>
        </div>
      </div>
    </AuthGuard>
  );
}