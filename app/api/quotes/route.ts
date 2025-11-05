import { NextRequest, NextResponse } from "next/server";
import { solana } from "@faremeter/info";
import { createPaywallMiddleware } from "../lib/paywallMiddleware";

// Create paywall middleware for premium quotes
const quotesPaywall = createPaywallMiddleware({
  facilitatorURL: "https://facilitator.corbits.dev",
  accepts: [
    {
      ...solana.x402Exact({
        network: "devnet", 
        asset: "USDC",
        amount: 200, // $0.0002 USDC in base units (0.0002 * 1,000,000)
        payTo: "YOUR_WALLET_ADDRESS", // Replace with your actual wallet
      }),
      resource: "https://yourapi.com/api/quotes",
      description: "Premium programming quotes - Inspirational coding wisdom for 0.0002 USDC",
    },
  ],
});

export async function GET(request: NextRequest) {
  return quotesPaywall.middleware(request, async (req: NextRequest) => {
    // Premium programming quotes
    const quotes = [
      "Code is like humor. When you have to explain it, it's bad. - Cory House",
      "First, solve the problem. Then, write the code. - John Johnson",
      "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler",
      "The best error message is the one that never shows up. - Thomas Fuchs",
      "Talk is cheap. Show me the code. - Linus Torvalds",
      "Programs must be written for people to read, and only incidentally for machines to execute. - Harold Abelson",
      "The most important property of a program is whether it accomplishes the intention of its user. - C.A.R. Hoare",
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    return NextResponse.json({ 
      quote,
      timestamp: new Date().toISOString(),
      paid: true,
      type: "premium_quote"
    });
  });
}

// Add token to valid tokens
export async function POST(request: NextRequest) {
  const { token } = await request.json();
  quotesPaywall.addValidToken(token);
  return NextResponse.json({ success: true });
}