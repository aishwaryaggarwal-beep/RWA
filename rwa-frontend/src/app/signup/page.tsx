"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/src/components/ParticleBackground";

export default function SignupPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);

  if (!ready) return null;

  return (
    <>
      <ParticleBackground />
      <div className="auth-container">
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2 style={{ marginBottom: "10px" }}>Create Your Account</h2>
          <p style={{ color: "#9ca3af", marginBottom: "30px", fontSize: "14px" }}>
            Join the RWA platform to start investing in real world assets
          </p>

          <button 
            className="btn big" 
            onClick={() => login()}
            style={{ 
              width: "100%", 
              background: "linear-gradient(135deg, #22c55e, #4ade80)",
              color: "#000",
              border: "none",
              padding: "15px",
              fontSize: "16px",
              fontWeight: "bold"
            }}
          >
            Get Started with Privy
          </button>

          <div style={{ marginTop: "30px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
            <p style={{ color: "#9ca3af", fontSize: "12px" }}>
              Join using your Email, Google account, or Crypto Wallet. <br/>
              No password management required.
            </p>
          </div>

          <div style={{ marginTop: '25px', textAlign: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>Already have an account? </span>
            <button 
              onClick={() => login()}
              style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
            >
              Log in here
            </button>
          </div>
        </div>
      </div>
    </>
  );
}