declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: import('@solana/web3.js').PublicKey;
      isConnected?: boolean;
      connect(): Promise<{ publicKey: import('@solana/web3.js').PublicKey }>;
      disconnect(): Promise<void>;
      signTransaction(transaction: import('@solana/web3.js').Transaction): Promise<import('@solana/web3.js').Transaction>;
      signAllTransactions(transactions: import('@solana/web3.js').Transaction[]): Promise<import('@solana/web3.js').Transaction[]>;
    };
  }
}

export {};