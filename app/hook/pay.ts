'use client';
import { useState } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// Add window.solana type
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: PublicKey;
      isConnected?: boolean;
      connect(): Promise<{ publicKey: PublicKey }>;
      signTransaction(transaction: Transaction): Promise<Transaction>;
    };
  }
}

interface PaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export function usePayment() {
  const [processing, setProcessing] = useState(false);

  const processPayment = async (
    paymentId: string,
    amount: number,
    token: string
  ): Promise<PaymentResult> => {
    setProcessing(true);
    
    try {
      // Check if wallet is connected
      if (typeof window === 'undefined' || !window.solana) {
        throw new Error('Solana wallet not found. Please install Phantom wallet.');
      }

      const wallet = window.solana;
      
      if (!wallet.isConnected) {
        await wallet.connect();
      }

      if (!wallet.publicKey) {
        throw new Error('Wallet public key not available');
      }

      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      // USDC Mainnet mint address
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      
      // Payment receiver (demo - sends to burn address)
      const receiverPublicKey = new PublicKey('11111111111111111111111111111112');
      
      // Get token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const receiverTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        receiverPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Convert 0.0001 USDC to smallest unit (USDC has 6 decimals)
      const usdcAmount = Math.floor(0.0001 * Math.pow(10, 6)); // 100 micro-USDC
      
      const transaction = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount,
          receiverTokenAccount,
          wallet.publicKey,
          usdcAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      return { success: true, signature };
      
    } catch (error) {
      console.error('USDC Payment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'USDC payment failed' 
      };
    } finally {
      setProcessing(false);
    }
  };

  return { processPayment, processing };
}