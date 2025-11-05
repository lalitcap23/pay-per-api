"use client";

import { useState } from "react";
import { usePayment } from "./hook/pay";
import { useWallet } from "./hook/useWallet";

interface PaymentData {
  error: string;
  message: string;
  price: { amount: number; token: string };
  paymentId: string;
}

interface JokeData {
  joke: string;
  timestamp: string;
  paid: boolean;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState<PaymentData | null>(null);
  const [joke, setJoke] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready to fetch a bad joke 🎭");
  
  const { processPayment, processing } = usePayment();
  const { connected, connecting, publicKey, connectWallet, disconnectWallet } = useWallet();

  async function getJoke() {
    setLoading(true);
    setStatus("Fetching your bad joke...");
    setPaymentRequired(null);
    setJoke(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Add auth token if we have one
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch("/api/jokes", { headers });

      if (res.status === 402) {
        const data: PaymentData = await res.json();
        setStatus("💰 Payment Required");
        setPaymentRequired(data);
      } else if (res.ok) {
        const data: JokeData = await res.json();
        setStatus("😂 Here's your joke!");
        setJoke(data.joke);
      } else {
        setStatus("Something went wrong ❌");
      }
    } catch (error) {
      console.error("Error fetching joke:", error);
      setStatus("Network error ❌");
    }

    setLoading(false);
  }

  // Real USDC payment
  async function handleRealPayment() {
    if (!paymentRequired) return;
    
    setStatus("Processing USDC payment... 💳");
    
    const result = await processPayment(
      paymentRequired.paymentId,
      paymentRequired.price.amount,
      paymentRequired.price.token
    );

    if (result.success && result.signature) {
      setStatus("Verifying payment... ✅");
      
      try {
        // Verify payment with backend
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signature: result.signature,
            paymentId: paymentRequired.paymentId
          })
        });

        const verifyData = await verifyRes.json();
        
        if (verifyData.verified) {
          // Store auth token and add to valid tokens
          setAuthToken(verifyData.token);
          
          await fetch("/api/jokes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: verifyData.token })
          });
          
          setStatus("🎉 Payment successful! Fetching your joke...");
          setPaymentRequired(null);
          
          // Automatically fetch the joke
          setTimeout(() => getJoke(), 1000);
          
        } else {
          setStatus("❌ Payment verification failed");
        }
        
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("❌ Verification error");
      }
      
    } else {
      setStatus(`❌ Payment failed: ${result.error}`);
    }
  }

  // Simulate payment (for testing)
  function simulatePayment() {
    if (paymentRequired) {
      setStatus("😂 Here's your joke!");
      setJoke("Why did the developer quit his job? He didn't get arrays! (This joke was paid for 💰)");
      setPaymentRequired(null);
    }
  }

  const isLoading = loading || processing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Pay-Per-Bad-Joke API 🤡
          </h1>
          <p className="text-blue-200">
            USDC micropayments for premium jokes
          </p>
          <p className="text-blue-300 text-sm">
            0.0001 USDC per joke
          </p>
          
          {/* Wallet Status */}
          <div className="mt-4 flex justify-center">
            {!connected ? (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-purple-400 disabled:to-pink-400 text-white rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100"
              >
                {connecting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    👛 Connect Wallet
                  </span>
                )}
              </button>
            ) : (
              <div className="bg-green-500/20 border border-green-400/50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-green-200 text-sm font-medium">Wallet Connected</p>
                    <p className="text-green-300 text-xs">
                      {publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="ml-2 text-green-300 hover:text-green-100 text-xs underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          {/* Status */}
          <div className="text-center mb-6">
            <div className="text-lg font-medium text-white mb-4">
              {status}
            </div>
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Joke Display */}
          {joke && !isLoading && (
            <div className="bg-white/20 rounded-lg p-4 mb-6 border-l-4 border-purple-400">
              <p className="text-white text-lg italic">"{joke}"</p>
            </div>
          )}

          {/* Payment Required */}
          {paymentRequired && !isLoading && (
            <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-200 mb-2">Payment Required</h3>
              <p className="text-yellow-100 mb-1">
                Amount: {paymentRequired.price.amount} {paymentRequired.price.token}
              </p>
              <p className="text-yellow-200 text-sm mb-4">
                ID: {paymentRequired.paymentId}
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRealPayment}
                  disabled={isLoading || !connected}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg font-medium transition-colors"
                  title={!connected ? "Please connect wallet first" : ""}
                >
                  💵 Pay USDC
                </button>
                
                <button
                  onClick={simulatePayment}
                  disabled={isLoading}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-white rounded-lg font-medium transition-colors"
                >
                  🧪 Demo
                </button>
              </div>
            </div>
          )}

          {/* Main Action Button */}
          {!paymentRequired && (
            <div className="text-center">
              <button
                onClick={getJoke}
                disabled={isLoading}
                className="w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl font-semibold text-lg transition-colors"
              >
                {isLoading ? "Loading..." : "Get Bad Joke 🎭"}
              </button>
            </div>
          )}

          {/* Auth Status */}
          {authToken && (
            <div className="text-center mt-4">
              <p className="text-green-300 text-sm">
                ✅ Payment verified - ready for jokes!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
