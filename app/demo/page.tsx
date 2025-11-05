"use client";

import { useState } from "react";

export default function APIDemo() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState("");

  const addResult = (result: any) => {
    setResults(prev => [...prev, { timestamp: new Date().toISOString(), ...result }]);
  };

  const testEndpoint = async (endpoint: string, method: string = "GET", includeAuth: boolean = false) => {
    setLoading(true);
    try {
      const headers: any = {
        "Content-Type": "application/json",
      };
      
      if (includeAuth && authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(endpoint, {
        method,
        headers,
      });

      const data = await response.json();
      
      addResult({
        endpoint,
        method,
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      addResult({
        endpoint,
        method,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setLoading(false);
  };

  const verifyPayment = async (signature: string, endpoint?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          paymentId: `demo_${Date.now()}`,
          endpoint,
        }),
      });

      const data = await response.json();
      
      if (data.verified && data.token) {
        setAuthToken(data.token);
      }
      
      addResult({
        endpoint: "/api/verify-payment",
        method: "POST",
        status: response.status,
        data,
      });
    } catch (error) {
      addResult({
        endpoint: "/api/verify-payment",
        method: "POST",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Pay-Per-API Demo</h1>
      <p className="text-gray-600">Test the faremeter-powered paywall APIs</p>

      {/* API Testing Buttons */}
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Free Endpoints</h2>
          <button
            onClick={() => testEndpoint("/api/jokes/free")}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Get Free Programming Joke
          </button>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Paywalled Endpoints (402 Payment Required)</h2>
          <div className="space-x-2">
            <button
              onClick={() => testEndpoint("/api/jokes")}
              disabled={loading}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              Get Premium Dad Joke (0.0001 USDC)
            </button>
            <button
              onClick={() => testEndpoint("/api/quotes")}
              disabled={loading}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              Get Premium Quote (0.0002 USDC)
            </button>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">With Authentication</h2>
          <div className="space-y-2">
            <div className="space-x-2">
              <button
                onClick={() => testEndpoint("/api/jokes", "GET", true)}
                disabled={loading || !authToken}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                Get Joke (Authenticated)
              </button>
              <button
                onClick={() => testEndpoint("/api/quotes", "GET", true)}
                disabled={loading || !authToken}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                Get Quote (Authenticated)
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {authToken ? `Token: ${authToken.slice(0, 20)}...` : "No auth token - verify a payment first"}
            </p>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Payment Verification</h2>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter transaction signature"
              className="w-full p-2 border rounded"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const input = e.target as HTMLInputElement;
                  verifyPayment(input.value, "/api/jokes");
                }
              }}
            />
            <button
              onClick={() => {
                // Demo signature for testing
                const demoSig = "5VfUQ7XdTgCr1EzryJgBWoJwZdLJJoCM8e9VbGWKK7eiHhPKGNj4DEHmMZFX8q9TXgGJJ9Q2QjjGwTYH4VW5DZGE";
                verifyPayment(demoSig, "/api/jokes");
              }}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Test with Demo Signature
            </button>
          </div>
        </div>
      </div>

      {/* Clear Results */}
      <button
        onClick={() => setResults([])}
        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
      >
        Clear Results
      </button>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">API Results</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">No API calls made yet</p>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm">
                    {result.method} {result.endpoint}
                  </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.status === 200 ? "bg-green-100 text-green-800" :
                    result.status === 402 ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {result.status || "ERROR"}
                  </span>
                </div>
                <pre className="text-sm overflow-auto bg-white p-2 rounded">
                  {JSON.stringify(result.data || result.error, null, 2)}
                </pre>
                <p className="text-xs text-gray-500 mt-2">{result.timestamp}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}