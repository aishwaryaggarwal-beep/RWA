"use client";

import { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polygonAmoy } from "viem/chains";
import { http, injected } from "wagmi";

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology"), 
  },
  connectors: [injected()], // ✅ Explicitly add injected for MetaMask
  multiInjectedProviderDiscovery: true,
});








export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmov3zugb00x00cjyucgb5vxp"}
        config={{
          loginMethods: ["email", "google"], // 🛡️ Removed "wallet" to stop Phantom/MetaMask popups
          appearance: {

            theme: "dark",
            accentColor: "#7c3aed",
            showWalletLoginFirst: false, // ✨ Prioritize Google/Email over MetaMask
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
          supportedChains: [polygonAmoy],
          // 🚫 HARD BLOCK: Stop searching for MetaMask/Phantom on page load
          externalWallets: {
            showWalletLoginFirst: false,
            injected: {
              enabled: true, // ✅ Re-enabled for MetaMask support
            }
          },

        }}
      >






        <WagmiProvider config={wagmiConfig}>
          <>{children}</>
        </WagmiProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
