"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export default function WalletConnect() {
  const { login, logout, authenticated } = usePrivy();
  const { address } = useAccount();

  return (
    <div className="flex flex-col gap-4">
      {authenticated ? (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-sm text-slate-400 mb-2">Connected Wallet</p>
          <p className="font-mono text-emerald-400">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Loading..."}
          </p>
          <button 
            className="mt-4 w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-semibold"
            onClick={() => logout()}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          className="w-full py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 transition-all active:scale-95"
          onClick={() => login()}
        >
          Connect with Privy
        </button>
      )}
    </div>
  );
}