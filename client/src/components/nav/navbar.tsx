"use client";

import Link from "next/link";
import { UserCircle2, ListChecks, BarChartBig } from "lucide-react"; // Icons

export default function Navbar() {
  // Placeholder for user data - in a real app, this might influence UI (e.g., show/hide links)
  // const { user, isAuthenticated } = useAuth(); // Example auth context

  return (
    <nav className="bg-slate-800 text-slate-100 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center text-sky-400 hover:text-sky-300 transition-colors"
            >
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
                  href="/portfolio"
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <BarChartBig size={18} className="mr-1.5" /> Portfolio
                </Link>
                <Link
                  href="/profile" // Direct link to Profile page
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <UserCircle2 size={18} className="mr-1.5" /> Profile
                </Link>
              </div>
            </div>
            <div className="md:hidden flex items-center">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/watchlist"
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <ListChecks size={24} />
                </Link>
                <Link
                  href="/portfolio"
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <BarChartBig size={24} />
                </Link>
                <Link
                  href="/profile"
                  className="text-slate-300 hover:bg-slate-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <UserCircle2 size={24} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
