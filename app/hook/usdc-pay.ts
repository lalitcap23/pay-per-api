'use client';
import { useState } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

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

export function useUSDCPayment() {
  const [processing, setProcessing] = useState(false);

  const processPayment = async (
    amount: number, // In base units (e.g., 100 = 0.0001 USDC)
    recipient: string,
    usdcMintAddress: string,
    network: 'devnet' | 'mainnet-beta' = 'devnet'
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

      // Connect to the appropriate network
      const rpcUrl = network === 'devnet' 
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com';
      
      const connection = new Connection(rpcUrl, 'confirmed');
      
      const usdcMint = new PublicKey(usdcMintAddress);
      const receiverPublicKey = new PublicKey(recipient);
      
      // Get sender's token account
      const senderTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Get receiver's token account
      const receiverTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        receiverPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check if receiver's token account exists
      const receiverAccountInfo = await connection.getAccountInfo(receiverTokenAccount);
      
      const transaction = new Transaction();
      
      // If receiver doesn't have a token account, create it
      if (!receiverAccountInfo) {
        console.log('Creating associated token account for receiver...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey, // payer
            receiverTokenAccount, // ata
            receiverPublicKey, // owner
            usdcMint, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }
      
      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          receiverTokenAccount,
          wallet.publicKey,
          amount, // Amount in base units
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
      
      console.log('Transaction sent:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Transaction confirmed:', signature);

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

