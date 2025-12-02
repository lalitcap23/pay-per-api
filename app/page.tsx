"use client";

import { useState, useEffect } from "react";
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
  const [status, setStatus] = useState<string>("Ready");
  const [paymentStep, setPaymentStep] = useState<'idle' | 'requesting' | 'payment' | 'verifying' | 'success'>('idle');
  
  const { processPayment, processing } = usePayment();
  const { connected, connecting, publicKey, connectWallet, disconnectWallet } = useWallet();

  // Update payment step based on state
  useEffect(() => {
    if (loading && !paymentRequired) {
      setPaymentStep('requesting');
    } else if (paymentRequired && processing) {
      setPaymentStep('payment');
    } else if (status.includes('Verifying')) {
      setPaymentStep('verifying');
    } else if (joke) {
      setPaymentStep('success');
    } else if (paymentRequired) {
      setPaymentStep('payment');
    } else {
      setPaymentStep('idle');
    }
  }, [loading, paymentRequired, processing, status, joke]);

  async function getJoke(token?: string) {
    setLoading(true);
    setStatus("Requesting premium content...");
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
        setStatus("Payment Required");
        setPaymentRequired(data);
      } else if (res.ok) {
        const data: JokeData = await res.json();
        setStatus("Content Delivered");
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
    if (!paymentRequired) return;
    
    setStatus("Processing payment...");
    
    const result = await processPayment(
      paymentRequired.paymentId,
      paymentRequired.price.amount,
      paymentRequired.price.token
    );

    if (result.success && result.signature) {
      setStatus("Verifying payment...");
      
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
          
          setStatus("Payment verified");
          setPaymentRequired(null);
          
          // Automatically fetch the joke with the token (don't wait for state to update!)
          setTimeout(() => getJoke(verifyData.token), 500);
          
        } else {
          setStatus("Payment verification failed");
        }
        
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("Verification error");
      }
      
    } else {
      setStatus(`Payment failed: ${result.error}`);
    }
  }

  // Simulate payment (for testing)
  function simulatePayment() {
    if (paymentRequired) {
      setStatus("Content Delivered");
      setJoke("Why did the developer quit his job? He didn't get arrays! (This joke was paid for 💰)");
      setPaymentRequired(null);
    }
  }

  const isLoading = loading || processing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl">
                  <span className="text-3xl">🤡</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  PayJoke API
                </h1>
                <p className="text-sm text-gray-500">x402 Payment Protocol</p>
              </div>
            </div>
            
            {/* Wallet Connection - Compact */}
            {!connected ? (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" />
                    </svg>
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            ) : (
              <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 rounded-xl shadow-sm">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-emerald-800">Connected</p>
                  <p className="text-xs font-mono text-emerald-600">
                    {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : ''}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="ml-2 px-3 py-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-blue-200/50 rounded-full mb-6 shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-gray-700">Powered by Corbits SDK</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Premium Jokes
            </span>
            <br />
            <span className="text-gray-900">Behind a Paywall</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Experience the future of API monetization with <span className="font-semibold text-gray-900">x402 HTTP Payment Protocol</span> and seamless Solana micropayments
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full shadow-sm hover:shadow-md transition-shadow">
              <span className="text-sm font-semibold text-gray-700">HTTP 402</span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full shadow-sm hover:shadow-md transition-shadow">
              <span className="text-sm font-semibold text-gray-700">Corbits SDK</span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full shadow-sm hover:shadow-md transition-shadow">
              <span className="text-sm font-semibold text-gray-700">0.0001 USDC</span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full shadow-sm hover:shadow-md transition-shadow">
              <span className="text-sm font-semibold text-gray-700">Solana Devnet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive x402 Protocol Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-8 sm:px-12 py-12 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-4xl">💳</span>
              </div>
              <div>
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-2">HTTP 402 Payment Required</h2>
                <p className="text-xl text-blue-100">The Future of API Monetization</p>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 space-y-12">
            {/* What is x402 */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></span>
                What is HTTP 402?
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                <p className="text-lg text-gray-700 leading-relaxed mb-4">
                  <strong className="text-gray-900">HTTP 402 Payment Required</strong> is a reserved HTTP status code that was originally intended for digital payment systems. While it was defined in HTTP/1.1 (RFC 2616), it was reserved for future use and has now become the foundation for modern micropayment protocols.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  The x402 protocol enables API endpoints to require payment before delivering content, creating a standardized way to monetize APIs and digital services through micropayments. This protocol is particularly powerful when combined with blockchain technology, allowing for instant, low-cost payments without traditional payment processors.
                </p>
              </div>
            </div>

            {/* History & Background */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></span>
                History & Background
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">RFC 2616 (1999)</h4>
                  <p className="text-gray-700 leading-relaxed">
                    HTTP 402 was originally reserved in the HTTP/1.1 specification but never fully implemented due to lack of standardized payment systems at the time.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">Modern Revival</h4>
                  <p className="text-gray-700 leading-relaxed">
                    With the advent of blockchain technology and cryptocurrencies, x402 has found new life as a protocol for API monetization through micropayments.
                  </p>
                </div>
              </div>
            </div>

            {/* Protocol Flow Diagram */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-orange-600 to-amber-600 rounded-full"></span>
                Protocol Flow
              </h3>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-100">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">1</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Client Makes Request</h4>
                      <p className="text-gray-700">Client sends HTTP request to protected API endpoint without payment token</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">2</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Server Responds 402</h4>
                      <p className="text-gray-700">Server checks for valid payment token. If missing, returns 402 with payment details including amount, recipient, and payment ID</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">3</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Client Processes Payment</h4>
                      <p className="text-gray-700">Client receives payment details, prompts user, and processes payment on blockchain (e.g., Solana). Transaction is signed and broadcast</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">4</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Payment Verification</h4>
                      <p className="text-gray-700">Client sends transaction signature to verification endpoint. Server validates transaction on blockchain, checks amount and recipient match</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">5</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Content Delivery</h4>
                      <p className="text-gray-700">Server generates auth token and client retries original request with token. Server validates token and delivers premium content</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Use Cases */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-teal-600 to-cyan-600 rounded-full"></span>
                Use Cases & Applications
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
                  <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🔌</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">API Monetization</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">Charge per API call instead of subscriptions. Perfect for pay-per-use services</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">📰</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Content Paywalls</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">Unlock premium articles, videos, or media with micropayments</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Gaming & NFTs</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">In-game purchases, NFT unlocks, and premium game features</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">AI Services</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">Pay per AI inference, model access, or premium AI features</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Data Services</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">Access premium datasets, analytics, or real-time data feeds</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-100">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Premium Features</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">Unlock advanced features, higher rate limits, or exclusive access</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-rose-600 to-pink-600 rounded-full"></span>
                Key Benefits
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Instant Payments</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed">Blockchain payments settle in seconds, enabling real-time access to content without waiting for traditional payment processing</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Low Fees</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed">Micropayments are economically viable with blockchain networks like Solana, where transaction fees are fractions of a cent</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">No Middlemen</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed">Direct peer-to-peer payments eliminate payment processors, reducing costs and increasing revenue for content creators</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Standardized Protocol</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed">HTTP 402 is a standard status code, making it compatible with existing HTTP infrastructure and easy to implement</p>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-violet-600 to-purple-600 rounded-full"></span>
                Technical Specifications
              </h3>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-8 border border-violet-100">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-lg">HTTP Status Code</h4>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <code className="text-gray-800 font-mono">402 Payment Required</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-lg">Response Headers</h4>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-green-400 font-mono text-sm">
{`WWW-Authenticate: Payment realm="API"
Accept-Payment: solana-pay
Content-Type: application/json`}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-lg">Response Body Structure</h4>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-green-400 font-mono text-sm">
{`{
  "error": "Payment Required",
  "price": {
    "amount": 100,
    "token": "USDC",
    "currency": "USD"
  },
  "paymentId": "unique_payment_id",
  "network": "devnet" | "mainnet",
  "paymentDetails": {
    "recipient": "wallet_address",
    "splToken": "token_mint_address",
    "memo": "optional_memo"
  },
  "expiresAt": "ISO_timestamp"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Implementation with Corbits */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-blue-600 rounded-full"></span>
                Implementation with Corbits SDK
              </h3>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  The <strong className="text-gray-900">Corbits SDK</strong> (also known as Faremeter) provides a complete implementation of the x402 protocol, making it easy to add payment-gated endpoints to your API.
                </p>
                <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="ml-4 text-gray-400 text-sm font-mono">Server-Side Implementation</span>
                  </div>
                  <pre className="text-green-400 font-mono text-sm">
{`import { express as faremeter } from "@faremeter/middleware";
import { solana } from "@faremeter/info";

// Create payment middleware
const paywall = await faremeter.createMiddleware({
  facilitatorURL: "https://facilitator.corbits.dev",
  accepts: [
    {
      ...solana.x402Exact({
        network: "devnet",
        asset: "USDC",
        amount: 100,  // 0.0001 USDC
        payTo: "your_wallet_address",
      }),
      resource: "/api/premium-content",
      description: "Premium content access",
    },
  ],
});

// Use in API route
export async function GET(request) {
  const response = await paywall(request);
  if (response) {
    return response; // 402 Payment Required
  }
  // Payment verified - serve content
  return NextResponse.json({ content: "..." });
}`}
                  </pre>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-bold text-gray-900 mb-2">Client-Side</h4>
                    <p className="text-gray-700 text-sm">Use <code className="bg-gray-100 px-2 py-1 rounded">@faremeter/fetch</code> for automatic payment handling</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-bold text-gray-900 mb-2">Payment Verification</h4>
                    <p className="text-gray-700 text-sm">Corbits handles blockchain transaction verification automatically</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-cyan-600 to-blue-600 rounded-full"></span>
                x402 vs Traditional Payment Methods
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <thead className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Feature</th>
                      <th className="px-6 py-4 text-left font-bold">x402 Protocol</th>
                      <th className="px-6 py-4 text-left font-bold">Traditional Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Settlement Time</td>
                      <td className="px-6 py-4 text-gray-700">Seconds</td>
                      <td className="px-6 py-4 text-gray-700">Days</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Transaction Fees</td>
                      <td className="px-6 py-4 text-gray-700">$0.0001 - $0.01</td>
                      <td className="px-6 py-4 text-gray-700">2-3% + fixed fees</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Minimum Payment</td>
                      <td className="px-6 py-4 text-gray-700">Any amount</td>
                      <td className="px-6 py-4 text-gray-700">$0.50 - $1.00</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Chargebacks</td>
                      <td className="px-6 py-4 text-gray-700">Impossible</td>
                      <td className="px-6 py-4 text-gray-700">Possible</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Global Access</td>
                      <td className="px-6 py-4 text-gray-700">Yes, borderless</td>
                      <td className="px-6 py-4 text-gray-700">Restricted by region</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Integration</td>
                      <td className="px-6 py-4 text-gray-700">HTTP standard</td>
                      <td className="px-6 py-4 text-gray-700">Complex APIs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Future of Micropayments */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full"></span>
                The Future of Micropayments
              </h3>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  The x402 protocol represents a paradigm shift in how we think about digital payments. As blockchain technology matures and transaction costs decrease, micropayments will become the standard for:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700"><strong className="text-gray-900">Pay-per-use APIs</strong> - Charge exactly for what users consume, not fixed subscriptions</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700"><strong className="text-gray-900">Content monetization</strong> - Writers, creators, and artists can monetize individual pieces of content</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700"><strong className="text-gray-900">IoT and machine-to-machine payments</strong> - Devices can autonomously pay for services</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700"><strong className="text-gray-900">Decentralized web services</strong> - Build truly decentralized applications with built-in payment mechanisms</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
              <h3 className="text-3xl font-bold mb-4">Ready to Implement x402?</h3>
              <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
                Start monetizing your API with the Corbits SDK and experience the future of micropayments
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a href="https://docs.corbits.dev" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors">
                  View Documentation
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-colors">
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* How it Works Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 p-8 sm:p-12 mb-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-600 text-lg">Simple three-step process to access premium content</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">1️⃣</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-center text-lg">Request Content</h3>
                <p className="text-gray-600 text-sm text-center leading-relaxed">Make an API request to access premium content</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">2️⃣</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-center text-lg">402 Payment</h3>
                <p className="text-gray-600 text-sm text-center leading-relaxed">Server responds with payment details via x402 protocol</p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">3️⃣</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-center text-lg">Pay & Access</h3>
                <p className="text-gray-600 text-sm text-center leading-relaxed">Complete micropayment and receive your premium content</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Demo Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50 px-8 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <>
                    <div className="relative">
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
                      <div className="absolute inset-0 rounded-full border-3 border-blue-200"></div>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">Processing...</p>
                      <p className="text-sm text-gray-500">{status}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full ${
                        joke ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 
                        paymentRequired ? 'bg-orange-500 shadow-lg shadow-orange-500/50' : 
                        'bg-gray-400'
                      }`}></div>
                      {joke && (
                        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{status}</p>
                      <p className="text-sm text-gray-500">
                        {paymentStep === 'idle' && 'Ready to request content'}
                        {paymentStep === 'requesting' && 'Sending API request...'}
                        {paymentStep === 'payment' && 'Awaiting payment...'}
                        {paymentStep === 'verifying' && 'Verifying transaction...'}
                        {paymentStep === 'success' && 'Content delivered'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {authToken && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-emerald-800">Payment Verified</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-8">

            {/* Joke Display */}
            {joke && !isLoading && (
              <div className="relative mb-8 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-2xl opacity-20 blur group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200/50 rounded-2xl p-8 shadow-lg">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-4xl">😂</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-emerald-900">Premium Content Delivered</h3>
                        <div className="px-2.5 py-1 bg-emerald-100 border border-emerald-200 rounded-lg">
                          <span className="text-xs font-semibold text-emerald-700">PAID</span>
                        </div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-4 border border-emerald-100">
                        <p className="text-gray-900 text-xl leading-relaxed font-medium">
                          "{joke}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold">Verified via x402 Protocol</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* x402 Payment Required */}
            {paymentRequired && !isLoading && (
              <div className="relative mb-8 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl opacity-20 blur group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border border-orange-200/50 rounded-2xl p-8 shadow-lg">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-4xl">💳</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-orange-900">
                          HTTP 402 - Payment Required
                        </h3>
                        <div className="px-3 py-1 bg-orange-100 border border-orange-200 rounded-lg">
                          <span className="text-xs font-bold text-orange-700">x402 PROTOCOL</span>
                        </div>
                      </div>
                      <p className="text-orange-800 mb-6 leading-relaxed">
                        This API endpoint requires a micropayment before access. Complete the payment below to receive your premium content.
                      </p>
                      
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-orange-200/50 mb-6 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</p>
                            <p className="text-lg font-bold text-gray-900">
                              {paymentRequired.price.amount} {paymentRequired.price.token}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Network</p>
                            <p className="text-lg font-bold text-gray-900 capitalize">{paymentRequired.network}</p>
                          </div>
                          <div className="sm:col-span-2 space-y-1 pt-2 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment ID</p>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="font-mono text-xs text-gray-800 break-all">
                                {paymentRequired.paymentId}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleRealPayment}
                      disabled={isLoading || !connected}
                      className="flex-1 relative group/btn inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/25 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                      title={!connected ? "Please connect wallet first" : ""}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                      <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" />
                      </svg>
                      <span className="relative z-10">
                        {!connected ? 'Connect Wallet First' : 'Pay with Wallet'}
                      </span>
                    </button>
                    
                    <button
                      onClick={simulatePayment}
                      disabled={isLoading}
                      className="px-8 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 rounded-xl font-semibold transition-all duration-200 border border-gray-300 hover:border-gray-400 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-2">
                        <span>🧪</span>
                        <span>Demo Mode</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Action Button */}
            {!paymentRequired && !joke && (
              <div className="text-center">
                <button
                  onClick={() => getJoke()}
                  disabled={isLoading || !connected}
                  className="relative group w-full px-8 py-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-500 text-white rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-2xl shadow-purple-500/25 disabled:shadow-none disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  <span className="relative flex items-center justify-center gap-4">
                    <span className="text-3xl">🎭</span>
                    <span>
                      {isLoading ? "Processing..." : !connected ? "Connect Wallet to Continue" : "Request Premium Joke"}
                    </span>
                  </span>
                </button>
                <p className="text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  This will trigger the x402 payment protocol for API access
                </p>
              </div>
            )}

            {/* Request Another Joke Button */}
            {joke && !paymentRequired && (
              <div className="text-center">
                <button
                  onClick={() => {
                    setJoke(null);
                    getJoke();
                  }}
                  disabled={isLoading}
                  className="relative group w-full px-8 py-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-500 text-white rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-2xl shadow-purple-500/25 disabled:shadow-none disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  <span className="relative flex items-center justify-center gap-4">
                    <span className="text-3xl">🎭</span>
                    <span>
                      {isLoading ? "Processing..." : "Request Another Joke"}
                    </span>
                  </span>
                </button>
                <p className="text-gray-500 text-sm mt-4">
                  Each joke requires a new payment (true micropayments)
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        <div className="text-center text-gray-500 text-sm">
          <p>Built with <span className="font-semibold text-gray-700">Corbits SDK</span> • Powered by <span className="font-semibold text-gray-700">x402 Protocol</span></p>
        </div>
      </footer>
    </div>
  );
}
