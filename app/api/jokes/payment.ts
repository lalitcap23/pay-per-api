import { NextResponse } from "next/server";
import {
  Keypair,
  PublicKey,
  Connection
} from "@solana/web3.js";
import { lookupKnownSPLToken } from "@faremeter/info/solana";
import * as fs from "fs";

export async function POST(request: Request) {
  try {
    const { signature, paymentId } = await request.json();
    
    // Load keypair from file (server-side only)
    const keypairData = JSON.parse(fs.readFileSync("./payer-wallet.json", "utf-8"));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    
    const network = "mainnet-beta";
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    
    // Verify the signature exists and is confirmed
    const signatureStatus = await connection.getSignatureStatus(signature);
    
    if (signatureStatus.value?.confirmationStatus === 'confirmed' || 
        signatureStatus.value?.confirmationStatus === 'finalized') {
      
      // Generate auth token for subsequent requests
      const authToken = `bearer_${Date.now()}_${signature.slice(0, 16)}`;
      
      return NextResponse.json({ 
        verified: true, 
        token: authToken,
        signature 
      });
    } else {
      return NextResponse.json({ 
        verified: false, 
        error: "Payment not confirmed" 
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ 
      error: "Verification failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}