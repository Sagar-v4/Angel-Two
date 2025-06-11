"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogOut, UserCircle, Mail, Smartphone, Briefcase, History, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { AngelOneProfile, FullProfileResponse } from '@/lib/types';
import { toast } from "sonner"; // For feedback on logout

const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_BASE_URL || 'http://localhost:8080';

export default function ProfilePage() {
  const [profile, setProfile] = useState<AngelOneProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          method: 'GET',
          credentials: 'include', // Send cookies
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}`}));
          if (response.status === 401) { // Unauthorized
            router.push('/'); // Redirect to login
            return;
          }
          throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
        }

        const result: FullProfileResponse = await response.json();

        if (result.status && result.data) {
          setProfile(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch profile data');
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "An unexpected error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    if (!profile?.clientcode) {
      toast.error("Client code not available for logout.");
      // Fallback: attempt generic logout if client code isn't there but user wants out
      // This might just clear cookie via middleware if backend call fails without clientcode
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookie for auth service to invalidate its session token
        body: JSON.stringify({ clientcode: profile?.clientcode || "" }), // Send clientcode
      });

      if (response.ok) {
        toast.success("You have been successfully logged out.");
        router.push('/'); // Redirect to login page
        router.refresh(); // Force refresh to clear any client-side session state
      } else {
        const errData = await response.json().catch(() => ({ message: "Logout failed" }));
        console.error('Logout failed:', errData.message);
        toast.error(errData.message || "Please try again.");
      }
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error("An unexpected error occurred during logout.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-sky-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading profile...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-900 text-white p-4">
         <Alert variant="destructive" className="w-full max-w-md bg-slate-800 border-red-700 text-red-300">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Profile</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-900 text-white">
        Profile data not found.
      </div>
    );
  }

  // Helper to parse stringified arrays, assuming AngelOneProfile has exchanges/products as string[]
  const parseStringArray = (strArray: string[] | string): string[] => {
    if (Array.isArray(strArray)) return strArray; // Already an array
    if (typeof strArray === 'string') {
      try {
        const parsed = JSON.parse(strArray);
        return Array.isArray(parsed) ? parsed : [strArray]; // Fallback to original string in an array
      } catch (err) {  console.error("Error fetching profile:", err);
        setError(
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "An unexpected error occurred."
        );
        return [strArray]; // If parsing fails, return the original string in an array
      }
    }
    return [];
  };

  const displayExchanges = Array.isArray(profile.exchanges) ? profile.exchanges : parseStringArray(profile.exchanges as string);
  const displayProducts = Array.isArray(profile.products) ? profile.products : parseStringArray(profile.products as string);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 p-4 md:p-8 flex justify-center items-start">
      <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 rounded-full bg-sky-500/20 flex items-center justify-center mb-4 border-2 border-sky-500">
            <UserCircle size={60} className="text-sky-400" />
          </div>
          <CardTitle className="text-3xl text-sky-300">{profile.name}</CardTitle>
          <CardDescription className="text-slate-400">Client Code: {profile.clientcode}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="flex items-center p-3 bg-slate-700/50 rounded-md">
            <Mail size={18} className="mr-3 text-slate-400" />
            <span className="text-slate-300">Email:</span>
            <span className="ml-auto font-medium text-slate-100">{profile.email || 'N/A'}</span>
          </div>
          <div className="flex items-center p-3 bg-slate-700/50 rounded-md">
            <Smartphone size={18} className="mr-3 text-slate-400" />
            <span className="text-slate-300">Mobile:</span>
            <span className="ml-auto font-medium text-slate-100">{profile.mobileno || 'N/A'}</span>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-md">
            <div className="flex items-center mb-2">
                <Briefcase size={18} className="mr-3 text-slate-400" />
                <span className="text-slate-300">Exchanges:</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-9">
              {displayExchanges.map((ex, index) => (
                <span key={index} className="px-2 py-0.5 bg-sky-700 text-sky-100 text-xs rounded-full">
                  {ex}
                </span>
              ))}
            </div>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-md">
            <div className="flex items-center mb-2">
                <CheckCircle size={18} className="mr-3 text-slate-400" /> {/* Or another relevant icon */}
                <span className="text-slate-300">Products:</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-9">
              {displayProducts.map((prod, index) => (
                <span key={index} className="px-2 py-0.5 bg-teal-700 text-teal-100 text-xs rounded-full">
                  {prod}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center p-3 bg-slate-700/50 rounded-md">
            <History size={18} className="mr-3 text-slate-400" />
            <span className="text-slate-300">Last Login:</span>
            <span className="ml-auto font-medium text-slate-100">{profile.lastlogintime || 'N/A'}</span>
          </div>
           <div className="flex items-center p-3 bg-slate-700/50 rounded-md">
            <XCircle size={18} className="mr-3 text-slate-400" /> {/* Placeholder icon */}
            <span className="text-slate-300">Broker ID:</span>
            <span className="ml-auto font-medium text-slate-100">{profile.brokerid || 'N/A'}</span>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center"
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}