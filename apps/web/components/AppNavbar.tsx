"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Printer, User, LogOut, ShieldAlert, Home, Clock } from "lucide-react";
import { useAuth } from "@/lib/authContext";

export function AppNavbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signInWithGoogle, signOut, loading } = useAuth();

  const [imgError, setImgError] = useState<boolean>(false);
  const rawPhoto = profile?.photoURL || user?.photoURL;
  const userPhoto = !imgError ? rawPhoto : null;
  const userInitials = (profile?.displayName || user?.displayName || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    setImgError(false);
  }, [user?.uid, rawPhoto]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 tracking-tight shrink-0">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base sm:text-lg text-slate-900">PrintMart</span>
          </Link>
          <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md hidden sm:inline-block">
            Campus Kiosk
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link
            href="/"
            className={`text-xs font-semibold transition-colors ${
              pathname === "/" ? "text-sky-600 font-bold" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Home
          </Link>
          <Link
            href="/user/print"
            className={`text-xs font-semibold transition-colors ${
              pathname === "/user/print" ? "text-sky-600 font-bold" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Start Printing
          </Link>
          {user && (
            <Link
              href="/user/history"
              className={`text-xs font-semibold transition-colors ${
                pathname === "/user/history" ? "text-sky-600 font-bold" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              My Print Jobs
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* Auth Actions (Fully Responsive for Mobile & Desktop) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User text info (desktop only) */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-neutral-900 truncate max-w-[140px]">
                  {profile?.displayName || user.displayName || "User"}
                </span>
                <span className="text-[10px] text-neutral-500 truncate max-w-[140px]">{user.email}</span>
              </div>

              {/* Real Profile Image with referrerPolicy fallback */}
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={user.displayName || "User"}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-xs shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-200 shrink-0 shadow-xs">
                  {userInitials}
                </div>
              )}

              {/* Sign Out Button (Visible on both mobile & desktop) */}
              <button
                type="button"
                onClick={() => signOut()}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-neutral-200/80 z-40 sm:hidden flex items-center justify-around py-2 px-3 shadow-lg">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/" ? "text-sky-600 font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/user/print"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/user/print" ? "text-sky-600 font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Printer className="w-5 h-5" />
          <span>Print</span>
        </Link>
        {user && (
          <Link
            href="/user/history"
            className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
              pathname === "/user/history" ? "text-sky-600 font-bold" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Jobs</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-rose-600"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
