'use client';
import { useState } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { lookupKnownSPLToken } from "@faremeter/info/solana";

interface USDCPaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export function useUSDCPayment() {
  const [processing, setProcessing] = useState(false);

  const processUSDCPayment = async (
    paymentId: string,
    amount: number
  ): Promise<USDCPaymentResult> => {
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
      
      // Get USDC token info for mainnet
      const network = "mainnet-beta";
      const usdcInfo = lookupKnownSPLToken(network, "USDC");
      if (!usdcInfo) {
        throw new Error('USDC token info not found for mainnet');
      }
      
      const usdcMint = new PublicKey(usdcInfo.address);
      
      // Payment receiver (you can change this to your wallet address)
      const receiverPublicKey = new PublicKey('11111111111111111111111111111112'); // Burn address for demo
      
      // Get associated token accounts
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

      // Convert amount to USDC decimals (USDC has 6 decimals)
      const usdcAmount = Math.floor(amount * Math.pow(10, 6)); // 0.0001 USDC = 100 micro-USDC
      
      // Create transaction
      const transaction = new Transaction();
      
      // Check if receiver token account exists, if not, create it
      const receiverAccountInfo = await connection.getAccountInfo(receiverTokenAccount);
      if (!receiverAccountInfo) {
        // For simplicity, we'll skip account creation in this demo
        // In production, you'd add createAssociatedTokenAccountInstruction
        console.log('Receiver token account does not exist');
      }

      // Add USDC transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount,     // source token account
        receiverTokenAccount,   // destination token account
        wallet.publicKey,       // owner of source account
        usdcAmount,            // amount in smallest unit (micro-USDC)
        [],                    // multi-signers (none in this case)
        TOKEN_PROGRAM_ID       // token program
      );

      transaction.add(transferInstruction);

      // Set recent blockhash and fee payer
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

  return { processUSDCPayment, processing };
}