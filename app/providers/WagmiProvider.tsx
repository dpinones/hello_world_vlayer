"use client";

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseSepolia, sepolia, optimismSepolia } from "viem/chains";

// Only include Anvil chain in development
const isDevelopment = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_INCLUDE_ANVIL === "true";

// Lazy import anvil only in development to avoid bundling localhost URLs in production
const getWagmiConfig = () => {
  if (isDevelopment) {
    const { anvil } = require("../lib/chains");
    return createConfig({
      chains: [anvil, sepolia, baseSepolia, optimismSepolia],
      connectors: [injected()],
      transports: {
        [anvil.id]: http("http://127.0.0.1:8545"),
        [sepolia.id]: http(),
        [baseSepolia.id]: http(),
        [optimismSepolia.id]: http(),
      },
    });
  }

  return createConfig({
    chains: [sepolia, baseSepolia, optimismSepolia],
    connectors: [injected()],
    transports: {
      [sepolia.id]: http(),
      [baseSepolia.id]: http(),
      [optimismSepolia.id]: http(),
    },
  });
};

const wagmiConfig = getWagmiConfig();

const queryClient = new QueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}


