import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShelbyClientProvider } from '@shelby-protocol/react'
import { ShelbyClient } from '@shelby-protocol/sdk/browser'
import { Network } from '@aptos-labs/ts-sdk'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 2,
    }
  }
})

const shelbyClient = new ShelbyClient({
  network: Network.TESTNET,
  apiKey: import.meta.env.VITE_API_KEY,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <App />
      </ShelbyClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
