import { NextResponse } from "next/server";

const validTokens = new Set<string>();

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim() ?? "";
  const isPaid = validTokens.has(token);

  if (!isPaid) {
    return new NextResponse(
      JSON.stringify({
        error: "Payment Required",
        price: { amount: 100, token: "USDC" },
        paymentId: `joke_${Date.now()}`,
        network: "devnet",
        paymentDetails: {
          recipient: "455q3UD1KkfMP7zWrd2XcYoZW8LaVoiU969cmusengZ9",
          splToken: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        },
      }),
      {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Payment realm="BadJokeAPI"',
          "Accept-Payment": "solana-pay",
        },
      }
    );
  }

  const res = await fetch("https://icanhazdadjoke.com/", {
    headers: { "Accept": "application/json" }
  });
  const data = await res.json();

  return NextResponse.json({
    joke: data.joke,
    paid: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const { token } = await request.json();
  validTokens.add(token);
  return NextResponse.json({ success: true });
}
