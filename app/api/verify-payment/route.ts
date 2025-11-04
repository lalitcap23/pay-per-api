import { NextResponse } from "next/server";
import {
  Connection,
  PublicKey
} from "@solana/web3.js";
import { lookupKnownSPLToken } from "@faremeter/info/solana";

// Mainnet Beta connection only
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// USDC token info for mainnet
const network = "mainnet-beta";
const usdcInfo = lookupKnownSPLToken(network, "USDC");
const EXPECTED_USDC_AMOUNT = 0.0001; // 0.0001 USDC

export async function POST(request: Request) {
  try {
    const { signature, paymentId } = await request.json();
    
    if (!signature || !paymentId) {
      return NextResponse.json(
        { error: "Missing signature or paymentId" },
        { status: 400 }
      );
    }

    console.log(`Verifying payment: ${signature} for ${paymentId}`);

    // Verify the transaction on Solana
    const transaction = await connection.getTransaction(signature, {
      commitment: "confirmed",
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 400 }
      );
    }

    // Enhanced verification for USDC payment
    const isValid = transaction.meta?.err === null;
    let isUSDCPayment = false;
    
    if (isValid && usdcInfo && transaction.meta?.preTokenBalances && transaction.meta?.postTokenBalances) {
      // Check if this is a USDC transfer of the correct amount
      const preBalances = transaction.meta.preTokenBalances;
      const postBalances = transaction.meta.postTokenBalances;
      
      // Look for USDC token transfers
      for (let i = 0; i < preBalances.length; i++) {
        const pre = preBalances[i];
        const post = postBalances[i];
        
        if (pre.mint === usdcInfo.address && post.mint === usdcInfo.address) {
          const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || "0");
          const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || "0");
          const transferAmount = preAmount - postAmount;
          
          // Check if the transfer amount matches expected USDC amount (with some tolerance)
          if (Math.abs(transferAmount - EXPECTED_USDC_AMOUNT) < 0.000001) {
            isUSDCPayment = true;
            break;
          }
        }
      }
    }

    if (isValid && isUSDCPayment) {
      // Generate a temporary auth token
      const authToken = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      return NextResponse.json({
        verified: true,
        token: authToken,
        transactionSignature: signature,
        paymentId,
        paymentType: "USDC",
        amount: EXPECTED_USDC_AMOUNT
      });
    } else if (isValid && !isUSDCPayment) {
      return NextResponse.json(
        { error: "Valid transaction but not a USDC payment of correct amount" },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Transaction failed or invalid" },
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