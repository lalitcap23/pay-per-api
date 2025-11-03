import { NextResponse } from "next/server";
import { PaymentServer } from "@faremeter/payment-solana";

const server = new PaymentServer({
  payer: "./payer-wallet.json",
  price: { amount: 0.0001, token: "USDC" },
});

export async function GET(request: Request) {
  const verification = await server.verify(request);

  if (!verification.paid) {
    // User hasn’t paid yet — send Payment Required
    return server.paymentRequiredResponse({
      message: "You must pay 0.0001 USDC to get a bad joke 🤡",
    });
  }

  // After payment → send joke
  const jokes = [
    "Why don't programmers like nature? It has too many bugs.",
    "Why do Java developers wear glasses? Because they don't C#.",
    "I told my computer I needed a break — it said no problem, it’ll go to sleep.",
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];

  return NextResponse.json({ joke });
}
