"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/src/components/ParticleBackground";

export default function LoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  // Manual Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const err = urlParams.get("error");
    const detailedErr = urlParams.get("details");
    if (err) {
      if (err === "sync_failed") setError("Account sync failed. This wallet or email might be used by another account.");
      else if (err === "connection_error") setError("Server connection error. Please try again.");
      else setError(decodeURIComponent(err) + (detailedErr ? `: ${decodeURIComponent(detailedErr)}` : ""));
    }
  }, []);



  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasError = urlParams.get("error");
    
    if (ready && authenticated && !hasError) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);


  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Server connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <>
      <ParticleBackground />
      <div className="auth-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="card" style={{ width: "100%", maxWidth: "420px", padding: "40px", borderRadius: "24px", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
          <h2 style={{ marginBottom: "10px", textAlign: "center", fontSize: "28px", fontWeight: "800" }}>Welcome Back</h2>
          <p style={{ color: "#9ca3af", marginBottom: "30px", fontSize: "14px", textAlign: "center" }}>
            Sign in to access the RWA Platform
          </p>

          {/* 🔑 Manual Login Form */}
          <form onSubmit={handleManualLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ position: "relative" }}>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input" 
                style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", color: "white" }}
              />
            </div>
            <div style={{ position: "relative" }}>
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input" 
                style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", color: "white" }}
              />
            </div>

            {error && (
              <p style={{ color: "#ef4444", fontSize: "13px", margin: "0", textAlign: "center" }}>⚠️ {error}</p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: "14px", 
                borderRadius: "12px", 
                border: "none", 
                background: "#3b82f6", 
                color: "white", 
                fontWeight: "bold", 
                fontSize: "16px", 
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "10px"
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* ⚡ Separator */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px", margin: "25px 0", opacity: 0.5 }}>
            <div style={{ flex: 1, height: "1px", background: "white" }} />
            <span style={{ fontSize: "12px" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "white" }} />
          </div>

          {/* 🌈 Privy Social Login */}
          <button 
            className="btn big" 
            onClick={() => login()}
            style={{ 
              width: "100%", 
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "15px",
              fontSize: "14px",
              fontWeight: "600",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              borderRadius: "12px"
            }}
          >
             Continue with Google / Email
          </button>

          <div style={{ marginTop: '25px', textAlign: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>New to RWA? </span>
            <button 
              onClick={() => login()}
              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
