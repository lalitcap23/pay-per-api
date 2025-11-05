import { NextRequest, NextResponse } from "next/server";

// Free endpoint - no payment required
export async function GET(request: NextRequest) {
  // Free users get a limited set of programming-themed jokes
  const freeJokes = [
    "Why did the programmer quit his job? He didn't get arrays!",
    "What do you call a programmer from Finland? Nerdic!",
    "How do you comfort a JavaScript bug? You console it!",
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "What's a programmer's favorite hangout place? Foo Bar!",
  ];
  
  const joke = freeJokes[Math.floor(Math.random() * freeJokes.length)];

  return NextResponse.json({ 
    joke,
    timestamp: new Date().toISOString(),
    paid: false,
    message: "This is a free joke! Upgrade to premium for better jokes 😄"
  });
}