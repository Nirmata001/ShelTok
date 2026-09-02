import React, { useState } from 'react';
import { 
  User as Person, 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink, 
  LogOut, 
  ChevronRight, 
  Film, 
  CloudUpload, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface ProfilePageProps {
  account: any;
  connected: boolean;
  wallets: readonly any[];
  connect: (name: any) => void;
  disconnect: () => void;
  blobs: any[];
  onNavigateToPosts: () => void;
  onNavigateToUpload: () => void;
  onClose?: () => void;
  triggerNotification: (message: string) => void;
}

const POPULAR_WALLETS = [
  { name: 'Petra', url: 'https://petra.app' },
  { name: 'Pontem', url: 'https://pontem.network' },
  { name: 'Martian', url: 'https://martianwallet.xyz' },
  { name: 'Rise', url: 'https://risewallet.io' },
  { name: 'Nightly', url: 'https://nightly.app' },
  { name: 'OKX Wallet', url: 'https://okx.com/web3' }
];

export default function ProfilePage({
  account,
  connected,
  wallets,
  connect,
  disconnect,
  blobs,
  onNavigateToPosts,
  onNavigateToUpload,
  onClose,
  triggerNotification
}: ProfilePageProps) {
  const [copied, setCopied] = useState(false);
  const [isSwitchingWallet, setIsSwitchingWallet] = useState(false);

  const walletAddress = account?.address?.toString() || '';
  const shortAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  // Count videos owned by this account
  const myUploadsCount = walletAddress
    ? blobs.filter((b: any) => {
        const owner = (b.owner || b.address || '').toString().toLowerCase();
        return owner === walletAddress.toLowerCase();
      }).length
    : 0;

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    triggerNotification('Wallet address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = (walletName: string) => {
    try {
      connect(walletName);
      triggerNotification(`Connecting to ${walletName}...`);
    } catch (e) {
      triggerNotification('Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    triggerNotification('Wallet disconnected');
    setIsSwitchingWallet(false);
  };

  return (
    <div className="w-full text-white px-4 md:px-0 pt-4 md:pt-14 pb-28 md:pb-12 animate-fade-in max-w-xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/70 hover:text-white"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Profile
            </h1>
          </div>
        </div>

        {connected && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all active:scale-95"
            title="Disconnect wallet"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        )}
      </div>

      {connected ? (
        /* CONNECTED VIEW */
        <div className="flex flex-col gap-5">
          {/* Identity Card */}
          <div className="relative overflow-hidden rounded-3xl bg-neutral-900/90 border border-white/10 p-5 shadow-2xl backdrop-blur-xl">
            {/* Ambient background glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#FE2C55]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#00f2ea]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Avatar circle */}
              <div className="relative shrink-0">
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-[#FE2C55] via-purple-600 to-[#00f2ea] p-[2px] shadow-lg">
                  <div className="w-full h-full rounded-[14px] bg-neutral-950 flex items-center justify-center">
                    <Person className="w-8 h-8 text-white/90" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-neutral-950 flex items-center justify-center" title="Connected">
                  <ShieldCheck className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                </div>
              </div>

              {/* Creator details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="font-bold text-base text-white tracking-tight">Aptos Creator</span>
                  <span className="flex items-center gap-1 text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                </div>

                {/* Address pill with 1-tap copy */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/85 transition-all group active:scale-95"
                    title="Click to copy full address"
                  >
                    <span>{shortAddress}</span>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                    )}
                  </button>

                  <a
                    href={`https://explorer.aptoslabs.com/account/${walletAddress}?network=testnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                    title="View on Aptos Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-white/10">
              <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-0.5">My Uploads</span>
                <span className="text-lg font-black text-white font-mono">{myUploadsCount}</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-0.5">Protocol</span>
                <span className="text-xs font-bold text-white/90 flex items-center justify-center gap-1 mt-1">
                  <Sparkles className="w-3 h-3 text-[#00f2ea]" />
                  Shelby v1
                </span>
              </div>
            </div>
          </div>

          {/* Quick Creator Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onNavigateToUpload}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FE2C55] to-[#E11D48] hover:brightness-105 active:scale-95 text-white font-bold text-sm shadow-lg shadow-[#FE2C55]/20 transition-all"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>

            <button
              onClick={onNavigateToPosts}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-white/15 active:scale-95 text-white font-bold text-sm transition-all"
            >
              <Film className="w-4 h-4 text-[#00f2ea]" />
              <span>My Posts ({myUploadsCount})</span>
            </button>
          </div>

          {/* Switch Wallet Section */}
          <div className="rounded-3xl bg-neutral-900/60 border border-white/10 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-white/60" />
                <span className="text-sm font-bold text-white">Wallet Management</span>
              </div>
              <button
                onClick={() => setIsSwitchingWallet(!isSwitchingWallet)}
                className="text-xs font-semibold text-[#00f2ea] hover:underline"
              >
                {isSwitchingWallet ? 'Hide Wallets' : 'Switch Wallet'}
              </button>
            </div>

            {isSwitchingWallet && (
              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/10 animate-fade-in">
                <p className="text-xs text-white/50 mb-1">
                  Choose another Aptos wallet to switch your account:
                </p>
                {POPULAR_WALLETS.map((wallet) => {
                  const detectedWallet = wallets?.find(w => 
                    w.name.toLowerCase().includes(wallet.name.toLowerCase())
                  );
                  const isInstalled = !!detectedWallet;

                  return (
                    <div
                      key={wallet.name}
                      onClick={() => {
                        if (isInstalled) {
                          handleConnect(detectedWallet.name);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isInstalled
                          ? 'bg-neutral-950/80 hover:bg-white/5 border-white/10 cursor-pointer active:scale-[0.98]'
                          : 'bg-neutral-950/40 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                          {isInstalled && detectedWallet.icon ? (
                            <img src={detectedWallet.icon} alt={wallet.name} className="w-5 h-5 object-contain" />
                          ) : (
                            <Wallet className="w-4 h-4 text-white/40" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white">{wallet.name}</p>
                        </div>
                      </div>

                      {isInstalled ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <span>Connect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <a
                          href={wallet.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-[10px] font-semibold transition-colors"
                        >
                          <span>Get</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DISCONNECTED / WALLET SELECTION VIEW */
        <div className="flex flex-col gap-5">
          {/* Guest Identity Card */}
          <div className="rounded-3xl bg-neutral-900/80 border border-white/10 p-5 text-center flex flex-col items-center gap-3 backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
              <Person className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connect Your Wallet</h2>
              <p className="text-xs text-white/50 max-w-sm mt-1 leading-relaxed">
                Connect an Aptos wallet to upload videos, curate your decentralized library, and interact with creators.
              </p>
            </div>
          </div>

          {/* Dedicated Wallets Page List */}
          <div className="rounded-3xl bg-neutral-900/60 border border-white/10 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#FE2C55]" />
                <h3 className="text-sm font-bold text-white">Select Aptos Wallet</h3>
              </div>
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                {wallets?.length || 0} Detected
              </span>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {POPULAR_WALLETS.map((wallet) => {
                const detectedWallet = wallets?.find(w => 
                  w.name.toLowerCase().includes(wallet.name.toLowerCase())
                );
                const isInstalled = !!detectedWallet;

                return (
                  <div
                    key={wallet.name}
                    onClick={() => {
                      if (isInstalled) {
                        handleConnect(detectedWallet.name);
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isInstalled
                        ? 'bg-neutral-950 hover:bg-white/10 border-white/15 cursor-pointer shadow-md active:scale-[0.98]'
                        : 'bg-neutral-950/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {isInstalled && detectedWallet.icon ? (
                          <img src={detectedWallet.icon} alt={wallet.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <Wallet className="w-5 h-5 text-white/40" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{wallet.name}</p>
                      </div>
                    </div>

                    {isInstalled ? (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FE2C55]/20 hover:bg-[#FE2C55] text-[#FE2C55] hover:text-white border border-[#FE2C55]/30 text-xs font-bold transition-all"
                      >
                        <span>Connect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <a
                        href={wallet.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-white/10"
                      >
                        <span>Install</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
