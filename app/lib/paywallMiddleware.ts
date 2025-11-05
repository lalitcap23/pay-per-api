import { express as faremeter } from "@faremeter/middleware";
import { solana } from "@faremeter/info";
import { NextRequest, NextResponse } from "next/server";

// Create Corbits middleware - this is ALL you need!
export async function createCorbitsPaywall(config: {
  amount: number;
  payTo: string;
  resource: string;
  description: string;
}) {
  // This is the EXACT Corbits way
  const middleware = await faremeter.createMiddleware({
    facilitatorURL: "https://facilitator.corbits.dev",
    accepts: [
      {
        ...solana.x402Exact({
          network: "devnet",
          asset: "USDC",
          amount: config.amount,
          payTo: config.payTo,
        }),
        resource: config.resource,
        description: config.description,
      },
    ],
  });

  return middleware;
}