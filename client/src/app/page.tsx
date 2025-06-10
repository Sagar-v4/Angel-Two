"use client"; // This component will have client-side interaction (onClick)

import Image from "next/image";

export default function LoginPage() {
  const apiKey = process.env.NEXT_PUBLIC_ANGELONE_API_KEY;

  if (!apiKey) {
    console.error(
      "Angel One API Key is not configured. Please check your .env.local file."
    );
    // Optionally, render an error message or a disabled button
  }

  const handleLoginRedirect = () => {
    if (apiKey) {
      const redirectUrl = `https://smartapi.angelone.in/publisher-login?api_key=${apiKey}`;
      // For App Router, router.push() is for client-side navigation.
      // For external URLs, window.location.href is standard.
      window.location.href = redirectUrl;
    } else {
      alert("Login configuration error. API key is missing.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
      <div className="flex flex-col items-center p-10 bg-slate-800/50 backdrop-blur-md rounded-xl shadow-2xl">
        <h1 className="mb-6 text-4xl font-bold tracking-tight">Login with</h1>
        <button
          onClick={handleLoginRedirect}
          disabled={!apiKey}
          className="transform transition-transform duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
          aria-label="Login with Angel One"
        >
          <Image
            src="/angel1.png" // Path relative to the 'public' folder
            alt="Angel One Login"
            width={200} // Specify appropriate width
            height={60} // Specify appropriate height (adjust based on image aspect ratio)
            priority // Load image with priority as it's important for LCP
            className="rounded-md shadow-lg"
          />
        </button>
        {!apiKey && (
          <p className="mt-4 text-red-400 text-sm">
            Login service is currently unavailable due to configuration issues.
          </p>
        )}
        <p className="mt-8 text-xs text-slate-400">
          You will be redirected to Angel One to complete your login.
        </p>
      </div>
    </main>
  );
}
