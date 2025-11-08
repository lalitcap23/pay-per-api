# Pay-per-API 🤡

A demonstration of **x402 HTTP Payment Protocol** for micropayments using the Corbits SDK. This project showcases how modern web APIs can implement per-endpoint billing with cryptocurrency micropayments.


## 🎯 Overview

PayJoke API implements the x402 HTTP Payment Protocol standard, where each API endpoint request requires a small USDC payment (0.0001 USDC) before delivering premium content. This demonstrates the future of monetized APIs and micropayment-gated services.

## Features

- **🔒 x402 Payment Protocol**: HTTP 402 "Payment Required" standard implementation
- **🛠️ Corbits SDK**: Professional payment infrastructure integration  
- **🎭 Premium Content**: Bad jokes delivered after successful payment
- **📱 Modern UI**: Clean interface
- **🔄 Per-Call Billing**: Each joke requires a separate payment (true micropayments)


### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Solana (Devnet), USDC SPL Token
- **Payments**: Corbits SDK, x402 Protocol
- **Wallet**: Phantom integration via Solana Web3.js
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Phantom wallet browser extension
- Solana Devnet USDC (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lalitcap23/pay-per-api.git
   cd pay-per-api/ppa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Building for Production

```bash
npm run build
npm start
```

## 🎮 Usage

1. **Connect Wallet**: Click "Connect Solana Wallet" and approve Phantom connection
2. **Request Joke**: Click "Request Premium Joke" button
3. **Receive 402**: Server responds with payment details (0.0001 USDC required)
4. **Make Payment**: Click "Pay with Wallet" and approve USDC transaction
5. **Get Content**: Joke is delivered after payment verification
6. **Repeat**: Each new joke requires a new payment (proper micropayments)

## 📡 API Endpoints

### `GET /api/jokes`
- **Purpose**: Fetch premium joke content
- **Auth**: Bearer token (obtained after payment)
- **Response**: `200` with joke or `402` Payment Required

### `POST /api/verify-payment`
- **Purpose**: Verify Solana transaction and generate auth token
- **Body**: `{ signature, paymentId, network }`
- **Response**: `{ verified: boolean, token: string }`

## 🔧 Configuration

### Environment Variables

```env
# Solana Configuration
SOLANA_NETWORK=devnet
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
RECIPIENT_WALLET=455q3UD1KkfMP7zWrd2XcYoZW8LaVoiU969cmusengZ9

# Payment Configuration
PAYMENT_AMOUNT=100  # 0.0001 USDC in base units
```

### Key Components

- **`useWallet`**: Any solana wallet connection management
- **`usePayment`**: Solana USDC payment processing
- **`corbitsMiddleware`**: x402 protocol implementation
- **Payment verification**: Blockchain transaction validation

## 💡 x402 Protocol Details

The **x402 HTTP Payment Protocol** is implemented as follows:

1. **Client Request**: Standard HTTP request to protected endpoint
2. **402 Response**: Server returns payment details:
   ```json
   {
     "error": "Payment Required",
     "price": { "amount": 100, "token": "USDC" },
     "paymentId": "joke_1699123456789",
     "network": "devnet",
     "paymentDetails": {
       "recipient": "455q3UD1KkfMP7zWrd2XcYoZW8LaVoiU969cmusengZ9",
       "splToken": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
     }
   }
   ```
3. **Payment Processing**: Client sends USDC via Solana
4. **Verification**: Server validates blockchain transaction
5. **Content Delivery**: Premium content delivered after successful payment
6. **Token Expiry**: Auth token cleared after content delivery (ensures per-call billing)

## 🛠️ Development

### Project Structure

```
ppa/
├── app/
│   ├── api/
│   │   ├── jokes/route.ts          # Main API endpoint
│   │   └── verify-payment/route.ts # Payment verification
│   ├── hook/
│   │   ├── pay.ts                  # Payment processing logic
│   │   └── useWallet.ts            # Wallet connection hook
│   ├── page.tsx                    # Main UI component
│   └── layout.tsx                  # App layout
├── package.json
└── README.md
```

### Key Features Implementation

- **Per-Call Billing**: Auth token cleared after each successful content delivery
- **TypeScript Safety**: Proper typing for all payment interfaces
- **Error Handling**: Comprehensive error states and user feedback
- **Responsive Design**: Mobile-friendly SaaS-level interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*This project demonstrates the future of API monetization through micropayments and the x402 HTTP Payment Protocol standard.* 

   ```
