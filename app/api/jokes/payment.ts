import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  PublicKey,
  Connection
} from "@solana/web3.js";
import { lookupKnownSPLToken } from "@faremeter/info/solana";
import * as fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const { signature, paymentId, endpoint } = await request.json();
    
    // For demo purposes, we'll use devnet
    const network = "devnet";
    const connection = new Connection("https://api.devnet.solana.com");
    
    // Verify the signature exists and is confirmed
    const signatureStatus = await connection.getSignatureStatus(signature);
    
    if (signatureStatus.value?.confirmationStatus === 'confirmed' || 
        signatureStatus.value?.confirmationStatus === 'finalized') {
      
      // Generate auth token for subsequent requests
      const authToken = `bearer_${Date.now()}_${signature.slice(0, 16)}`;
      
      // Notify the specific endpoint to add this token
      const endpointUrl = endpoint || '/api/jokes';
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${endpointUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: authToken }),
        });
      } catch (err) {
        console.warn('Failed to notify endpoint:', err);
      }
      
      return NextResponse.json({ 
        verified: true, 
        token: authToken,
        signature,
        message: "Payment verified! Use this token in Authorization header for future requests."
      });
    } else {
      return NextResponse.json({ 
        verified: false, 
        error: "Payment not confirmed or not found" 
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