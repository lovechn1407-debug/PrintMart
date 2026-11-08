"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Printer, User, LogOut, ShieldAlert, Home, Clock, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/authContext";
export function AppNavbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signInWithGoogle, signOut, loading } = useAuth();

  const [imgError, setImgError] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const rawPhoto = profile?.photoURL || user?.photoURL;
  const userPhoto = !imgError ? rawPhoto : null;
  const userInitials = (profile?.displayName || user?.displayName || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    setImgError(false);
  }, [user?.uid, rawPhoto]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          WARM HONEY-GOLDEN HEADER (Yellow on bottom to match homepage)
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-colors shadow-2xs">
        {/* Brand Logo & Title Tile */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 tracking-tight shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Printer className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight leading-tight">
                Print<span className="text-[#0c831f]">Mart</span>
              </span>
              <span className="text-[10px] font-semibold text-neutral-700 leading-none hidden xs:inline-block">
                Campus Kiosk
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link
            href="/"
            className={`text-xs font-semibold transition-colors ${
              pathname === "/" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
            }`}
          >
            Home
          </Link>
          <Link
            href="/user/print"
            className={`text-xs font-semibold transition-colors ${
              pathname === "/user/print" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
            }`}
          >
            Start Printing
          </Link>
          {user && (
            <Link
              href="/user/history"
              className={`text-xs font-semibold transition-colors ${
                pathname === "/user/history" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
              }`}
            >
              My Print Jobs
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold flex items-center gap-1 text-rose-700 bg-white/70 hover:bg-white px-2.5 py-1 rounded-full border border-rose-300/60 shadow-2xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-9 h-9 rounded-full bg-white/50 animate-pulse border border-amber-200/50" />
          ) : user ? (
            /* Logged In: Account Logo that reveals Dropdown on Click */
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-0.5 rounded-full bg-white border border-neutral-200 shadow-xs hover:ring-2 hover:ring-neutral-900/10 active:scale-95 transition-all shrink-0"
                title="Account menu"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={user.displayName || "User"}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                    {userInitials}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-neutral-600 mr-1 hidden sm:block" />
              </button>

              {/* Account Dropdown Popover */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200/90 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-neutral-100">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {profile?.displayName || user.displayName || "PrintMart User"}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <div className="px-1.5 py-1">
                    <Link
                      href="/user/history"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
                    >
                      <Clock className="w-4 h-4 text-neutral-500" />
                      <span>My Print Jobs</span>
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-neutral-100 px-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out: White & Black Sign In Button */
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-xs text-xs font-bold rounded-full flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            >
              <User className="w-3.5 h-3.5 text-neutral-950" />
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
            pathname === "/" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/user/print"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/user/print" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Printer className="w-5 h-5" />
          <span>Print</span>
        </Link>
        {user && (
          <Link
            href="/user/history"
            className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
              pathname === "/user/history" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
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
