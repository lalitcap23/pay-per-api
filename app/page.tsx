"use client";

import { useState } from "react";
import { usePayment } from "./hook/pay";
import { useWallet } from "./hook/useWallet";

interface PaymentData {
  error: string;
  message: string;
  price: { amount: number; token: string };
  paymentId: string;
  network: string;
  paymentDetails?: {
    recipient: string;
    splToken: string;
  };
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

  async function getJoke(token?: string) {
    setLoading(true);
    setStatus("Fetching your bad joke...");
    setPaymentRequired(null);
    setJoke(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Add auth token if we have one (use passed token or state token)
      const tokenToUse = token || authToken;
      if (tokenToUse) {
        headers["Authorization"] = `Bearer ${tokenToUse}`;
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
        // Clear auth token after successful joke delivery - each joke requires new payment
        setAuthToken(null);
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
    console.log("printing")
    console.log(paymentRequired)
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
            paymentId: paymentRequired.paymentId,
            network: paymentRequired.network
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
          
          // Automatically fetch the joke with the token (don't wait for state to update!)
          setTimeout(() => getJoke(verifyData.token), 500);
          
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <span className="text-4xl">🤡</span>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              PayJoke API
            </h1>
            <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
              Premium bad jokes delivered via x402 HTTP Payment Protocol
            </p>
            
            {/* x402 Protocol Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-xl font-bold text-blue-900">About x402 HTTP Payment Protocol</span>
              </div>
              <div className="text-left space-y-3">
                <p className="text-blue-800">
                  <strong>x402</strong> is an HTTP status code standard that enables micropayments for API endpoints. 
                  When you request content, the server responds with "402 Payment Required" along with payment details.
                </p>
                <p className="text-blue-700">
                  We use the <strong>Corbits SDK</strong> to implement this protocol, allowing seamless micropayments 
                  of <strong>0.0001 USDC</strong> per API call on Solana Devnet.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">HTTP 402</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">Corbits SDK</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">0.0001 USDC</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">Solana Devnet</span>
                </div>
              </div>
            </div>

            {/* Wallet Connection */}
            {!connected ? (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    Connecting Wallet...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" />
                    </svg>
                    Connect Solana Wallet
                  </>
                )}
              </button>
            ) : (
              <div className="inline-flex items-center gap-4 px-6 py-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
                <div className="text-left">
                  <p className="text-green-800 font-semibold">Wallet Connected</p>
                  <p className="text-green-600 font-mono text-sm">
                    {publicKey ? `${publicKey.slice(0, 12)}...${publicKey.slice(-8)}` : ''}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 text-green-700 hover:text-green-800 font-medium border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* How it Works Section */}
        <div className="bg-white rounded-2xl shadow-lg border p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How x402 Protocol Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">API Request</h3>
              <p className="text-gray-600 text-sm">Client requests protected content from API endpoint</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">402 Response</h3>
              <p className="text-gray-600 text-sm">Server returns payment details and pricing info</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Pay & Access</h3>
              <p className="text-gray-600 text-sm">Complete payment and receive premium content</p>
            </div>
          </div>
        </div>

        {/* API Demo Card */}
        <div className="bg-white rounded-2xl shadow-lg border p-8">
          {/* Status Bar */}
          <div className="border-b pb-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-lg font-semibold text-gray-700">Processing...</span>
                  </>
                ) : (
                  <>
                    <div className={`w-4 h-4 rounded-full ${
                      joke ? 'bg-green-500' : 
                      paymentRequired ? 'bg-orange-500' : 
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-lg font-semibold text-gray-800">{status}</span>
                  </>
                )}
              </div>
              
              {authToken && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Payment Verified
                </span>
              )}
            </div>
          </div>

          {/* Joke Display */}
          {joke && !isLoading && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 mb-8">
              <div className="flex items-start gap-4">
                <div className="text-4xl">😂</div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-3">Premium Content Delivered</h3>
                  <p className="text-green-900 text-xl leading-relaxed italic font-medium mb-4">
                    "{joke}"
                  </p>
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Paid via x402 Protocol</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* x402 Payment Required */}
          {paymentRequired && !isLoading && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="text-4xl">💳</div>
                <div>
                  <h3 className="text-xl font-bold text-orange-900 mb-3">
                    HTTP 402 - Payment Required
                  </h3>
                  <p className="text-orange-800 mb-4">
                    This API endpoint requires micropayment before access. The server has responded with x402 protocol details.
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-orange-200 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Amount:</span>
                        <span className="ml-2 text-gray-900">{paymentRequired.price.amount} {paymentRequired.price.token}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Network:</span>
                        <span className="ml-2 text-gray-900">{paymentRequired.network}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-gray-700">Payment ID:</span>
                        <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                          {paymentRequired.paymentId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleRealPayment}
                  disabled={isLoading || !connected}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100"
                  title={!connected ? "Please connect wallet first" : ""}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" />
                  </svg>
                  {!connected ? 'Connect Wallet First' : 'Pay with Wallet'}
                </button>
                
                <button
                  onClick={simulatePayment}
                  disabled={isLoading}
                  className="px-6 py-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors"
                >
                  🧪 Demo Mode
                </button>
              </div>
            </div>
          )}

          {/* @ts-ignore */}
          {/* Main Action Button */}
          {!paymentRequired && (
            <div className="text-center">
              <button
                onClick={() => getJoke()}
                disabled={isLoading}
                className="w-full px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl font-bold text-xl transition-all transform hover:scale-105 disabled:scale-100 shadow-xl"
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="text-3xl">🎭</span>
                  {isLoading ? "Loading..." : "Request Premium Joke"}
                </span>
              </button>
              <p className="text-gray-600 text-sm mt-4">
                This will trigger the x402 payment protocol for API access
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
