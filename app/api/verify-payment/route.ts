import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

export async function POST(request: Request) {
  try {
    const { signature, paymentId, network = 'devnet' } = await request.json();

    if (!signature) {
      return NextResponse.json(
        { verified: false, error: "Missing signature" },
        { status: 400 }
      );
    }

    // Connect to Solana to verify the transaction
    const rpcUrl = network === 'devnet' 
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';
    
    const connection = new Connection(rpcUrl, 'confirmed');

    // Fetch transaction details
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!tx) {
      return NextResponse.json(
        { verified: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify transaction was successful
    if (tx.meta?.err) {
      return NextResponse.json(
        { verified: false, error: "Transaction failed" },
        { status: 400 }
      );
    }

    // Generate auth token (in production, use proper JWT)
    const token = `payment_${signature}_${Date.now()}`;

    return NextResponse.json({
      verified: true,
      token,
      signature,
      paymentId
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { verified: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}

