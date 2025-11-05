import { NextResponse } from "next/server";

// Simple in-memory store for demo (use Redis/DB in production)
const validTokens = new Set<string>();

export async function GET(request: Request) {
  // Check for payment token in headers
  const authToken = request.headers.get('Authorization');
  const isPaid = authToken && validTokens.has(authToken.replace('Bearer ', ''));

  if (!isPaid) {
    // 402 Payment Required response with enhanced headers
    console.log("lawde ka JWT")
    return new Response(
      JSON.stringify({
        error: "Payment Required",
        message: "You must pay 0.0001 USDC to get a bad joke 🤡",
        price: { amount: 0.0001, token: "USDC" },
        paymentId: `joke_${Date.now()}`,
        network: "mainnet-beta",
      }),
      {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Payment realm="BadJokeAPI", charset="UTF-8"',
          "Accept-Payment": "solana-pay",
        },
      }
    );
  }

  // If paid → send a random joke
  const jokes = [
    "Why don't programmers like nature? It has too many bugs.",
    "Why do Java developers wear glasses? Because they don't C#.",
    "I told my computer I needed a break — it said no problem, it'll go to sleep.",
    "What's a programmer's favorite place to hang out? The Foo Bar.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "A SQL query goes into a bar, walks up to two tables and asks: 'Can I join you?'",
    "There are only 10 types of people in the world: those who understand binary and those who don't.",
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];

  return NextResponse.json({ 
    joke,
    timestamp: new Date().toISOString(),
    paid: true 
  });
}

// Add token to valid tokens (called after payment verification)
export async function POST(request: Request) {
  const { token } = await request.json();
  validTokens.add(token);
  return NextResponse.json({ success: true });
}
