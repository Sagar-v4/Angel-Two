"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, ListChecks, BarChartBig } from 'lucide-react'; // Icons
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Assuming you added Avatar

// You might need to install lucide-react: npm install lucide-react

const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_BASE_URL || 'http://localhost:8080';

export default function Navbar() {
  const router = useRouter();

  // This is a client component, so direct API calls need careful handling (CSRF, etc.)
  // For logout, we'll make an API call to our Next.js backend or directly to the Go API
  const handleLogout = async () => {
    try {
      // Option 1: Call your Next.js API route for logout (if you create one)
      // const response = await fetch('/api/auth/logout', { method: 'POST' });

      // Option 2: Call your Go API service's logout directly
      // This assumes your Go API's /api/logout expects a clientcode.
      // For a simple cookie-clearing logout from frontend, it might not be needed,
      // but for full backend invalidation it is.
      // For now, this example will primarily focus on clearing the cookie via middleware
      // by redirecting, or by making a specific logout call that clears the cookie.
      // A POST request might be better handled by an API route in Next.js.

      // For simplicity, let's assume your Go API /api/logout route clears the cookie
      // AND invalidates the session. We'll need to send the clientcode if it's required.
      // For now, let's make a "best effort" call without clientcode, relying on cookie.
      // A more robust solution would involve an API route in Next.js to handle this.
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Body might be needed if your Go API's /api/logout expects clientcode
        // body: JSON.stringify({ clientcode: "USER_CLIENT_CODE_FROM_SOMEWHERE" }),
      });

      if (response.ok) {
        // The Go API should have cleared the cookie via Set-Cookie header with Max-Age=-1
        // Or our middleware will handle this upon redirect.
        // Redirect to login page
        router.push('/');
        router.refresh(); // Important to re-fetch server components and clear client-side cache
      } else {
        console.error('Logout failed:', await response.text());
        // Handle logout error (e.g., show a toast)
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      alert('An error occurred during logout.');
    }
  };

  // Placeholder for user data - in a real app, this would come from a context or store
  const user = {
    name: "User Name", // Replace with actual user data if available
    email: "user@example.com", // Replace
    avatarUrl: "/user-avatar-placeholder.png", // Replace or use initials
  };

  return (
    <nav className="bg-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/watchlist" className="flex-shrink-0 flex items-center text-sky-400 hover:text-sky-300 transition-colors">
              {/* Optional: Your App Logo */}
              {/* <Image src="/app-logo.png" alt="App Logo" width={32} height={32} className="mr-2" /> */}
              <span className="font-bold text-xl">Angel Two</span>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/watchlist"
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <ListChecks size={18} className="mr-1.5" /> Watchlist
                </Link>
                <Link
                  href="/portfolio" // Assuming /portfolio will be created later
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <BarChartBig size={18} className="mr-1.5" /> Portfolio
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-700 p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>
                        {user.name ? user.name.substring(0, 2).toUpperCase() : <User size={20}/>}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-slate-100" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700"/>
                  <DropdownMenuItem
                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                    onSelect={() => router.push('/profile')} // Assuming /profile page later
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700"/>
                  <DropdownMenuItem
                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
                    onSelect={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Mobile menu button (optional) */}
          {/* <div className="-mr-2 flex md:hidden"> ... </div> */}
        </div>
      </div>
      {/* Mobile menu, show/hide based on menu state (optional) */}
      {/* <div className="md:hidden" id="mobile-menu"> ... </div> */}
    </nav>
  );
}