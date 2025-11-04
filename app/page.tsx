"use client";

import { useState } from "react";
import { usePayment } from "./hook/pay";
import { useUSDCPayment } from "./hook/usdc-pay";

interface PaymentData {
  error: string;
  message: string;
  price: { amount: number; token: string };
  paymentId: string;
  network?: string;
}

interface JokeData {
  joke: string;
  timestamp: string;
  paid: boolean;
}

export default function Home() {
  const [message, setMessage] = useState("Click to get a bad joke 🤡");
  const [loading, setLoading] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState<PaymentData | null>(null);
  const [joke, setJoke] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const { processPayment, processing } = usePayment();
  const { processUSDCPayment, processing: usdcProcessing } = useUSDCPayment();

  async function getJoke() {
    setLoading(true);
    setMessage("Fetching a bad joke...");
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
        setMessage(`💰 ${data.message}`);
        setPaymentRequired(data);
      } else if (res.ok) {
        const data: JokeData = await res.json();
        setMessage(`😂 Here's your joke:`);
        setJoke(data.joke);
      } else {
        setMessage("Something went wrong ❌");
      }
    } catch (error) {
      console.error("Error fetching joke:", error);
      setMessage("Network error ❌");
    }

    setLoading(false);
  }

  async function handleUSDCPayment() {
    if (!paymentRequired) return;
    
    setMessage("Processing USDC payment... 💳");
    
    const result = await processUSDCPayment(
      paymentRequired.paymentId,
      paymentRequired.price.amount
    );

    if (result.success && result.signature) {
      setMessage("Verifying USDC payment... ✅");
      
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
          
          setMessage("🎉 USDC Payment successful! Fetching your joke...");
          setPaymentRequired(null);
          
          // Automatically fetch the joke
          setTimeout(() => getJoke(), 1000);
          
        } else {
          setMessage("❌ USDC Payment verification failed");
        }
        
      } catch (error) {
        console.error("Verification error:", error);
        setMessage("❌ Verification error");
      }
      
    } else {
      setMessage(`❌ USDC Payment failed: ${result.error}`);
    }
  }

  async function handlePayment() {
    if (!paymentRequired) return;
    
    setMessage("Processing faremeter payment... 💳");
    
    const result = await processPayment(
      paymentRequired.paymentId,
      paymentRequired.price.amount,
      paymentRequired.price.token
    );

    if (result.success && result.signature) {
      setMessage("Verifying payment... ✅");
      
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
          
          setMessage("🎉 Payment successful! Fetching your joke...");
          setPaymentRequired(null);
          
          // Automatically fetch the joke
          setTimeout(() => getJoke(), 1000);
          
        } else {
          setMessage("❌ Payment verification failed");
        }
        
      } catch (error) {
        console.error("Verification error:", error);
        setMessage("❌ Verification error");
      }
      
    } else {
      setMessage(`❌ Payment failed: ${result.error}`);
    }
  }

  // Simulate payment (for testing)
  function simulatePayment() {
    if (paymentRequired) {
      alert("🎉 Payment successful! (Demo mode)");
      // In real implementation, this would trigger a re-fetch with payment proof
      setMessage("😂 Here's your joke:");
      setJoke("Why did the developer quit his job? He didn't get arrays! (This joke was paid for 💰)");
      setPaymentRequired(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-2">Pay-Per-Bad-Joke API 🤡</h1>
        <p className="text-gray-600 mb-6">USDC-powered monetized bad jokes (0.0001 USDC per joke)</p>
        
        <div className="bg-gray-100 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{message}</h2>
          
          {joke && (
            <div className="bg-white rounded-lg p-4 mt-4 border-l-4 border-purple-500">
              <p className="text-lg italic">"{joke}"</p>
            </div>
          )}
          
          {paymentRequired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-yellow-800">Payment Required</h3>
              <p className="text-yellow-700">Amount: {paymentRequired.price.amount} {paymentRequired.price.token}</p>
              <p className="text-sm text-yellow-600">ID: {paymentRequired.paymentId}</p>
              {paymentRequired.network && (
                <p className="text-sm text-yellow-600">Network: {paymentRequired.network}</p>
              )}
              
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={handleUSDCPayment}
                  disabled={usdcProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {usdcProcessing ? "Processing..." : "💵 Pay 0.0001 USDC"}
                </button>
                
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? "Processing..." : "� Faremeter Auto-Pay"}
                </button>
                
                <button
                  onClick={simulatePayment}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  🧪 Demo Payment
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={getJoke}
          disabled={loading}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-lg font-semibold"
        >
          {loading ? "Loading..." : "Get Bad Joke 🎭"}
        </button>
        
        {authToken && (
          <p className="text-sm text-green-600 mt-2">
            ✅ Payment verified - you can get jokes now!
          </p>
        )}
      </div>
    </div>
  );
}
