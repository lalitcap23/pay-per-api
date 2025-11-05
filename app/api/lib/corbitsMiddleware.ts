import { express as faremeter } from "@faremeter/middleware";
import { solana } from "@faremeter/info";

export async function createCorbitsPaywall(config: {
  amount: 100;      // 100 = 0.0001 USDC (in base units)
  payTo: '455q3UD1KkfMP7zWrd2XcYoZW8LaVoiU969cmusengZ9';       // Your Solana wallet address  
  resource: "string111";    // API endpoint being protected
  description: "bad joke"; // What user pays for
}) {
  
  // Official Corbits middleware - handles X402 standard
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