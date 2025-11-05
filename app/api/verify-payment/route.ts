import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey
} from "@solana/web3.js";
import { lookupKnownSPLToken } from "@faremeter/info/solana";

// Using devnet for demo purposes
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// USDC token info for devnet
const network = "devnet";
const usdcInfo = lookupKnownSPLToken(network, "USDC");

export async function POST(request: NextRequest) {
  try {
    const { signature, paymentId, endpoint, expectedAmount } = await request.json();
    
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    console.log(`Verifying payment: ${signature} for ${paymentId || 'unknown'}`);

    // For demo purposes, we'll do a simple signature status check
    // In production, you'd want more thorough verification
    const signatureStatus = await connection.getSignatureStatus(signature);
    
    if (signatureStatus.value?.confirmationStatus === 'confirmed' || 
        signatureStatus.value?.confirmationStatus === 'finalized') {
      
      // Generate auth token for subsequent requests
      const authToken = `bearer_${Date.now()}_${signature.slice(0, 16)}`;
      
      // If endpoint is specified, notify it to add this token
      if (endpoint) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: authToken }),
          });
          
          if (!response.ok) {
            console.warn(`Failed to notify endpoint ${endpoint}: ${response.statusText}`);
          }
        } catch (err) {
          console.warn(`Failed to notify endpoint ${endpoint}:`, err);
        }
      }
      
      return NextResponse.json({
        verified: true,
        token: authToken,
        transactionSignature: signature,
        paymentId: paymentId || `payment_${Date.now()}`,
        message: `Payment verified! Use "Authorization: Bearer ${authToken}" header for protected requests.`,
        usage: {
          example: `curl -H "Authorization: Bearer ${authToken}" ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${endpoint || '/api/jokes'}`
        }
      });
    } else {
      return NextResponse.json(
        { 
          error: "Payment not confirmed or transaction not found",
          signature: signature,
          status: signatureStatus.value?.confirmationStatus || 'unknown'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}