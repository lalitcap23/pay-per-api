# Corbits SDK (Faremeter) Tutorial

## 📚 Overview

The **Corbits SDK** (also known as **Faremeter**) is a payment infrastructure SDK that implements the **x402 HTTP Payment Protocol** standard. It enables you to add micropayment-gated API endpoints to your applications.

### What is x402 Protocol?

The x402 HTTP Payment Protocol is a standard that allows API endpoints to require payment before delivering content. When a client requests a protected resource, the server responds with HTTP status `402 Payment Required` along with payment details.

## 📦 SDK Packages

Your project uses these Corbits/Faremeter packages:

1. **`@faremeter/middleware`** - Server-side middleware for creating payment-protected endpoints
2. **`@faremeter/info`** - Payment configuration helpers (Solana, Ethereum, etc.)
3. **`@faremeter/payment-solana`** - Solana payment processing utilities
4. **`@faremeter/fetch`** - Client-side fetch wrapper that handles payment flows automatically

## 🏗️ Architecture

### How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│   API Route  │────────▶│  Corbits    │
│  (Browser)  │  GET    │  (Middleware)│         │ Facilitator │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ 402 Payment Required
                              ▼
                        ┌──────────────┐
                        │ Payment Info │
                        │ - Amount     │
                        │ - Network    │
                        │ - Recipient  │
                        └──────────────┘
                              │
                              │ User Pays
                              ▼
                        ┌──────────────┐
                        │  Blockchain  │
                        │  (Solana)    │
                        └──────────────┘
                              │
                              │ Verify
                              ▼
                        ┌──────────────┐
                        │   Content    │
                        │  Delivered   │
                        └──────────────┘
```

## 🔧 Server-Side Implementation

### 1. Creating Payment Middleware

The middleware is created using `@faremeter/middleware`:

```typescript
import { express as faremeter } from "@faremeter/middleware";
import { solana } from "@faremeter/info";

export async function createCorbitsPaywall(config: {
  amount: number;        // Amount in base units (100 = 0.0001 USDC)
  payTo: string;         // Your Solana wallet address
  resource: string;      // API endpoint identifier
  description: string;   // What the user is paying for
}) {
  const middleware = await faremeter.createMiddleware({
    facilitatorURL: "https://facilitator.corbits.dev",
    accepts: [
      {
        ...solana.x402Exact({
          network: "devnet",      // or "mainnet-beta"
          asset: "USDC",          // Token type
          amount: config.amount,  // Payment amount
          payTo: config.payTo,    // Recipient wallet
        }),
        resource: config.resource,
        description: config.description,
      },
    ],
  });

  return middleware;
}
```

### 2. Using Middleware in API Routes

In Next.js, you can use the middleware in your API routes:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createCorbitsPaywall } from "@/app/lib/paywallMiddleware";

export async function GET(request: NextRequest) {
  // Create the paywall middleware
  const paywall = await createCorbitsPaywall({
    amount: 100,  // 0.0001 USDC (100 base units)
    payTo: "455q3UD1KkfMP7zWrd2XcYoZW8LaVoiU969cmusengZ9",
    resource: "/api/jokes",
    description: "Premium joke access",
  });

  // Apply middleware to the request
  const response = await paywall(request);

  // If middleware returns a response, it means payment is required
  if (response) {
    return response;  // This will be a 402 Payment Required response
  }

  // Payment verified - serve the content
  const joke = await fetchJoke();
  return NextResponse.json({ joke });
}
```

### 3. Understanding `solana.x402Exact()`

The `solana.x402Exact()` function from `@faremeter/info` creates a payment configuration:

```typescript
solana.x402Exact({
  network: "devnet" | "mainnet-beta",
  asset: "USDC" | "SOL" | other SPL tokens,
  amount: number,  // Amount in base units (USDC has 6 decimals)
  payTo: string,   // Solana wallet address (base58)
})
```

**Important**: Amount is in base units, not human-readable units:
- 1 USDC = 1,000,000 base units (6 decimals)
- 0.0001 USDC = 100 base units
- 1 SOL = 1,000,000,000 lamports (9 decimals)

## 💻 Client-Side Implementation

### Option 1: Using `@faremeter/fetch` (Recommended)

The SDK provides a payment-aware fetch wrapper:

```typescript
import { fetchWithPayment } from "@faremeter/fetch";

async function getProtectedContent() {
  try {
    const response = await fetchWithPayment("/api/jokes", {
      wallet: window.solana,  // Solana wallet adapter
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Content:", data);
    }
  } catch (error) {
    console.error("Payment failed:", error);
  }
}
```

The `fetchWithPayment` function automatically:
1. Makes the initial request
2. Detects 402 Payment Required responses
3. Prompts user for payment
4. Processes the payment on Solana
5. Retries the request with payment proof
6. Returns the final response

### Option 2: Manual Implementation (Current Approach)

Your current implementation manually handles the payment flow:

```typescript
// 1. Make initial request
const res = await fetch("/api/jokes");

// 2. Check for 402 Payment Required
if (res.status === 402) {
  const paymentData = await res.json();
  // paymentData contains:
  // - price: { amount, token }
  // - paymentId
  // - network
  // - paymentDetails: { recipient, splToken }
  
  // 3. Process payment
  const signature = await processSolanaPayment(paymentData);
  
  // 4. Verify payment with backend
  const verifyRes = await fetch("/api/verify-payment", {
    method: "POST",
    body: JSON.stringify({ signature, paymentId: paymentData.paymentId }),
  });
  
  // 5. Retry request with auth token
  const finalRes = await fetch("/api/jokes", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

## 🔐 Payment Verification

After a payment is made, you need to verify it on the server:

```typescript
import { Connection } from "@solana/web3.js";

export async function POST(request: Request) {
  const { signature, paymentId, network } = await request.json();
  
  // Connect to Solana
  const connection = new Connection(
    network === "devnet" 
      ? "https://api.devnet.solana.com"
      : "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  
  // Fetch and verify transaction
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
  });
  
  if (!tx || tx.meta?.err) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }
  
  // Verify payment details match expected amount/recipient
  // ... validation logic ...
  
  // Generate auth token
  const token = generateAuthToken(signature);
  
  return NextResponse.json({ verified: true, token });
}
```

## 📋 Complete Example Flow

### Server-Side (`/api/jokes/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createCorbitsPaywall } from "@/app/lib/paywallMiddleware";

const paywall = await createCorbitsPaywall({
  amount: 100,
  payTo: process.env.RECIPIENT_WALLET!,
  resource: "/api/jokes",
  description: "Premium joke",
});

export async function GET(request: NextRequest) {
  // Check if request has valid payment token
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  
  if (!isValidToken(token)) {
    // Return 402 with payment details
    return paywall(request);
  }
  
  // Serve content
  const joke = await fetchJoke();
  return NextResponse.json({ joke });
}
```

### Client-Side (`page.tsx`)

```typescript
import { fetchWithPayment } from "@faremeter/fetch";

async function getJoke() {
  const response = await fetchWithPayment("/api/jokes", {
    wallet: window.solana,
  });
  
  if (response.ok) {
    const data = await response.json();
    setJoke(data.joke);
  }
}
```

## 🎯 Key Concepts

### 1. Facilitator URL

The `facilitatorURL: "https://facilitator.corbits.dev"` is Corbits' payment facilitator service that:
- Handles payment routing
- Provides payment verification
- Manages payment state

### 2. Payment Resources

Each protected endpoint should have a unique `resource` identifier. This helps track which endpoint was accessed.

### 3. Payment IDs

Each payment request should have a unique `paymentId` to prevent replay attacks and track individual payments.

### 4. Token-Based Auth

After payment verification, generate a short-lived auth token that allows access to the protected content. This token should be:
- Single-use (cleared after content delivery)
- Time-limited
- Tied to the specific payment

## 🔍 Current Implementation Notes

Your current implementation:
- ✅ Has the middleware setup code
- ✅ Manually implements 402 responses
- ✅ Handles payment processing on client
- ✅ Verifies payments on server
- ⚠️ Doesn't actually use the Corbits middleware in the API route

**To fully use Corbits SDK**, you should:
1. Use the middleware in your API routes instead of manual 402 responses
2. Consider using `@faremeter/fetch` on the client for automatic payment handling
3. Let Corbits handle payment verification instead of manual Solana transaction checking

## 📚 Additional Resources

- [Corbits Documentation](https://docs.corbits.dev)
- [x402 Protocol Specification](https://datatracker.ietf.org/doc/html/rfc402)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)

## 🚀 Next Steps

1. **Integrate middleware**: Use `createCorbitsPaywall` in your actual API routes
2. **Use `@faremeter/fetch`**: Simplify client-side payment handling
3. **Add error handling**: Handle payment failures gracefully
4. **Add payment history**: Track successful payments
5. **Support multiple tokens**: Allow payments in SOL, USDC, etc.





