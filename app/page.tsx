"use client";
import { useState } from "react";
import { pay } from "@faremeter/fetch";

export default function Home() {
  const [joke, setJoke] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getJoke() {
    setLoading(true);
    setError("");
    setJoke("");

    try {
      // Call API — pay() automatically handles 402 → opens wallet
      const res = await pay("/api/joke");
      const data = await res.json();
      setJoke(data.joke);
    } catch (err: any) {
      setError("Payment failed or canceled.");
    }

    setLoading(false);
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen text-center">
      <button
        onClick={getJoke}
        className="bg-blue-600 text-white px-5 py-2 rounded-xl shadow-lg"
      >
        {loading ? "Paying..." : "Get Bad Joke (0.001 USDC)"}
      </button>

      {error && <p className="mt-3 text-red-500">{error}</p>}
      {joke && <p className="mt-4 text-lg">{joke}</p>}
    </main>
  );
}
