import { NextRequest, NextResponse } from "next/server";
import { solana } from "@faremeter/info";
import { createPaywallMiddleware } from "../lib/paywallMiddleware";

// Create the paywall middleware with faremeter configuration
const paywalledMiddleware = createPaywallMiddleware({
  facilitatorURL: "https://facilitator.corbits.dev",
  accepts: [
    {
      ...solana.x402Exact({
        network: "devnet",
        asset: "USDC", 
        amount: 100, // $0.0001 USDC in base units (0.0001 * 1,000,000)
        payTo: "YOUR_WALLET_ADDRESS", // Replace with your actual wallet
      }),
      resource: "https://yourapi.com/api/jokes",
      description: "Premium dad joke API - Get fresh jokes from icanhazdadjoke.com for 0.0001 USDC",
    },
  ],
});

export async function GET(request: NextRequest) {
  // Use the paywall middleware
  return paywalledMiddleware.middleware(request, async (req) => {

    // If paid → fetch a random joke from icanhazdadjoke.com API
    let joke = "Why did the programmer quit his job? He didn't get arrays! (Fallback joke)";
    
    try {
      const response = await fetch('https://icanhazdadjoke.com/', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pay-Per-API Demo (https://github.com/lalitcap23/pay-per-api)'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        joke = data.joke;
      }
    } catch (error) {
      console.error('Failed to fetch joke from icanhazdadjoke.com:', error);
      // Will use fallback joke above
    }

    return NextResponse.json({ 
      joke,
      timestamp: new Date().toISOString(),
      paid: true 
    });
  });
}

// Add token to valid tokens (called after payment verification)
export async function POST(request: NextRequest) {
  const { token } = await request.json();
  paywalledMiddleware.addValidToken(token);
  return NextResponse.json({ success: true });
}
