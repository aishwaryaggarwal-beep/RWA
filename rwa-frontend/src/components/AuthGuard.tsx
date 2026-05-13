"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { API_URL } from "@/src/lib/api";

export default function AuthGuard({ children }: any) {
  const { user: privyUser, authenticated, ready, logout: privyLogout } = usePrivy();

  const router = useRouter();

  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, connector } = useAccount();

  const [loading, setLoading] = useState(true);

  // Prevent Phantom popup on initial refresh/hydration
  const hasHydrated = useRef(false);

  const hasChecked = useRef(false);

  useEffect(() => {
    const checkAndSync = async () => {
      // 🛡️ Prevent loops: If already verified, do nothing
      if (hasChecked.current) return;
      
      const token = localStorage.getItem("token");

      // Skip if Privy isn't ready AND we don't have a manual token
      if (!ready && !(!!token && !authenticated)) return;

      // 1. Not authenticated anywhere → go to login
      if (!token && !authenticated) {
        setLoading(false);
        if (window.location.pathname !== "/login") router.push("/login");
        return;
      }

      // 2. Authenticated in Privy but no backend token → sync with backend
      if (authenticated && !token && privyUser) {
        try {
          const email = privyUser.email?.address || privyUser.google?.email;
          const name = privyUser.google?.name || privyUser.email?.address?.split("@")[0];
          const walletAddress = privyUser.wallet?.address;

          if (email) {
            const res = await fetch(`${API_URL}/privy-sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, name, walletAddress }),
            });

            if (res.ok) {
              const data = await res.json();
              localStorage.setItem("token", data.token);
              localStorage.setItem("user", JSON.stringify(data.user));
              hasChecked.current = true;
              setLoading(false);
            } else {
              const errData = await res.json();
              const errorParam = encodeURIComponent(errData.message || "sync_failed");
              const detailsParam = errData.error ? `&details=${encodeURIComponent(errData.error)}` : "";
              
              // 🛡️ Break the loop: Forcibly logout if sync fails
              await privyLogout(); 
              localStorage.clear();
              
              router.push(`/login?error=${errorParam}${detailsParam}`);
            }

          }
        } catch (error) {
          router.push("/login?error=connection_error");
        }
        return;
      }

      // 3. Already have token -> Verify once
      if (token && !hasChecked.current) {
        try {
          const res = await fetch(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("user", JSON.stringify(data.user));
            hasChecked.current = true;
            setLoading(false);
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/login?error=session_expired");
          }
        } catch (e) {
          // Allow it if server is down but token exists locally
          hasChecked.current = true;
          setLoading(false);
        }
      }
    };

    checkAndSync();
  }, [ready, authenticated, privyUser, router]);



  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  if (loading && !ready && (!isMounted || !localStorage.getItem("token"))) {

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#000",
          color: "#fff",
        }}
      >
        <p>Verifying Authentication...</p>
      </div>
    );
  }

  return children;
}