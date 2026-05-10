"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

export default function HomePage() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard"); // 🔥 auto redirect
    } else {
      const token = localStorage.getItem("token");
      if (token) {
        router.push("/dashboard");
      }
    }
  }, [ready, authenticated, router]);

  const handleStart = () => {
    if (authenticated || localStorage.getItem("token")) {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  return (
    <div className="landing">

      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <h1>Invest in Real World Assets</h1>

          <p>
            Fractional ownership of land powered by blockchain.
            Secure, transparent and accessible to everyone.
          </p>

        <button className="btn big" onClick={handleStart}>
            Get Started
        </button>
        </div>

        {/* 🔥 Animated Side */}
        <div className="hero-animation">

            <div className="glow"></div>

            <div className="card card1">₹10L</div>
            <div className="card card2">Land NFT</div>
            <div className="card card3">+12%</div>

            <div className="particle p1"></div>
            <div className="particle p2"></div>
            <div className="particle p3"></div>

        </div>
      </section>

      {/* LAND SHOWCASE */}
      <section className="land-showcase">
        <h2>Explore Investment Opportunities</h2>

        <div className="land-grid">
          <div className="land-card">
            <h4>Farm Land - Pune</h4>
            <p>2000 sq ft</p>
            <p>₹10,00,000</p>
          </div>

          <div className="land-card">
            <h4>Plot - Nashik</h4>
            <p>1500 sq ft</p>
            <p>₹8,00,000</p>
          </div>

          <div className="land-card">
            <h4>Commercial Land - Mumbai</h4>
            <p>1000 sq ft</p>
            <p>₹25,00,000</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Start Investing Today</h2>
        <button className="btn big">Get Started</button>
      </section>

    </div>
  );
}