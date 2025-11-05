import { NextRequest, NextResponse } from "next/server";
import { solana } from "@faremeter/info";

interface PaywallConfig {
  facilitatorURL: string;
  accepts: Array<{
    resource: string;
    description: string;
    [key: string]: any;
  }>;
}

interface PaymentAccept {
  network: string;
  asset: string;
  amount: number;
  payTo: string;
  resource: string;
  description: string;
}

export class PaywallMiddleware {
  private config: PaywallConfig;
  private validTokens = new Set<string>();

  constructor(config: PaywallConfig) {
    this.config = config;
  }

  // Main middleware function for Next.js API routes
  async middleware(request: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) {
    // Check for payment token in headers
    const authToken = request.headers.get('Authorization');
    const isPaid = authToken && this.validTokens.has(authToken.replace('Bearer ', ''));

    if (!isPaid) {
      // Find the payment config for this resource
      const accept = this.config.accepts.find(a => 
        request.url.includes(a.resource.split('/').pop() || '')
      );
      
      if (!accept) {
        return NextResponse.json(
          { error: "Payment configuration not found" },
          { status: 500 }
        );
      }

      // 402 Payment Required response with faremeter format
      return new Response(
        JSON.stringify({
          error: "Payment Required",
          message: accept.description,
          price: { 
            amount: accept.amount / 1000000, // Convert from base units to readable format
            token: accept.asset 
          },
          paymentId: `api_${Date.now()}`,
          network: accept.network,
          facilitatorURL: this.config.facilitatorURL,
          paymentDetails: accept,
        }),
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": `Payment realm="${accept.description}", charset="UTF-8"`,
            "Accept-Payment": "solana-pay",
            "X-Faremeter-Facilitator": this.config.facilitatorURL,
          },
        }
      );
    }

    // If paid, proceed with the handler
    return handler(request);
  }

  // Verify payment and add token
  async verifyPayment(signature: string, paymentId: string): Promise<boolean> {
    try {
      // In a real implementation, you would verify the transaction on-chain
      // For now, we'll generate a token and add it to valid tokens
      const authToken = `bearer_${Date.now()}_${signature.slice(0, 16)}`;
      this.validTokens.add(authToken);
      return true;
    } catch (error) {
      console.error("Payment verification error:", error);
      return false;
    }
  }

  // Get valid token for a signature (for testing/demo purposes)
  getTokenForSignature(signature: string): string {
    return `bearer_${Date.now()}_${signature.slice(0, 16)}`;
  }

  // Add token manually (for testing)
  addValidToken(token: string): void {
    this.validTokens.add(token);
  }
}

// Create middleware instance with configuration
export const createPaywallMiddleware = (config: PaywallConfig) => {
  return new PaywallMiddleware(config);
};