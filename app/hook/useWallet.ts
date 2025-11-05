'use client';
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

// Solana Wallet interface
interface SolanaWallet {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  isConnected?: boolean;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect?(): Promise<void>;
}

interface WalletState {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  balance: number | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    connecting: false,
    publicKey: null,
    balance: null
  });

  // Check if wallet is already connected on page load
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.solana) {
        const solanaWallet = window.solana as SolanaWallet;
        if (solanaWallet.isConnected && solanaWallet.publicKey) {
          setWallet(prev => ({
            ...prev,
            connected: true,
            publicKey: solanaWallet.publicKey!.toString()
          }));
        }
      }
    };

    checkConnection();
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.solana) {
      alert('Please install Phantom wallet to continue');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      setWallet(prev => ({ ...prev, connecting: true }));
      
      const solanaWallet = window.solana as SolanaWallet;
      const response = await solanaWallet.connect();
      
      setWallet({
        connected: true,
        connecting: false,
        publicKey: response.publicKey.toString(),
        balance: null // Could fetch balance here
      });

      return response.publicKey.toString();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setWallet(prev => ({ ...prev, connecting: false }));
      throw error;
    }
  };

  const disconnectWallet = async () => {
    if (window.solana) {
      try {
        const solanaWallet = window.solana as SolanaWallet;
        if (solanaWallet.disconnect) {
          await solanaWallet.disconnect();
        }
        setWallet({
          connected: false,
          connecting: false,
          publicKey: null,
          balance: null
        });
      } catch (error) {
        console.error('Wallet disconnect failed:', error);
      }
    }
  };

  return {
    ...wallet,
    connectWallet,
    disconnectWallet
  };
}