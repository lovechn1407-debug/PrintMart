"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Printer, User, LogOut, ShieldAlert, Home, Clock, ChevronDown, Menu } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { Arc } from "@/components/loading-ui/arc";
export function AppNavbar() {
  const pathname = usePathname();
  const isMorePage = pathname === "/user/more" || pathname === "/more";
  const { user, profile, isAdmin, signInWithGoogle, signOut, loading } = useAuth();

  const [imgError, setImgError] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const handleNavClick = (target: string) => {
    if (pathname !== target) {
      if (isMorePage && typeof window !== "undefined") {
        window.dispatchEvent(new Event("more-page-exit"));
      }
      setPendingPath(target);
    }
  };

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
      {!isMorePage && (
        <header className="sticky top-0 z-50 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-colors shadow-2xs">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => handleNavClick("/")}
              className="flex items-center tracking-tight shrink-0 group py-1"
            >
              <img
                src="/brand/printmart-logo.webp"
                alt="PrintMart"
                className="h-9 sm:h-10 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links with Circular Buffer Feedback */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href="/"
              onClick={() => handleNavClick("/")}
              className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === "/" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
              }`}
            >
              {pendingPath === "/" && (
                <div className="w-3 h-3 rounded-full border-2 border-neutral-400 border-t-[#0c831f] animate-spin" />
              )}
              <span>Home</span>
            </Link>
            <Link
              href="/user/print"
              onClick={() => handleNavClick("/user/print")}
              className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === "/user/print" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
              }`}
            >
              {pendingPath === "/user/print" && (
                <div className="w-3 h-3 rounded-full border-2 border-neutral-400 border-t-[#0c831f] animate-spin" />
              )}
              <span>Start Printing</span>
            </Link>
            {user && (
              <Link
                href="/user/history"
                onClick={() => handleNavClick("/user/history")}
                className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname === "/user/history" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
                }`}
              >
                {pendingPath === "/user/history" && (
                  <div className="w-3 h-3 rounded-full border-2 border-neutral-400 border-t-[#0c831f] animate-spin" />
                )}
                <span>My Print Jobs</span>
              </Link>
            )}
            <Link
              href="/user/more"
              onClick={() => handleNavClick("/user/more")}
              className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === "/user/more" ? "text-neutral-950 font-bold" : "text-neutral-800 hover:text-neutral-950"
              }`}
            >
              {pendingPath === "/user/more" && (
                <div className="w-3 h-3 rounded-full border-2 border-neutral-400 border-t-[#0c831f] animate-spin" />
              )}
              <span>More</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => handleNavClick("/admin/dashboard")}
                className="text-xs font-bold flex items-center gap-1.5 text-rose-700 bg-white/70 hover:bg-white px-2.5 py-1 rounded-full border border-rose-300/60 shadow-2xs"
              >
                {pendingPath === "/admin/dashboard" ? (
                  <div className="w-3 h-3 rounded-full border-2 border-rose-300 border-t-rose-600 animate-spin" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
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
                      <Link
                        href="/user/more"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
                      >
                        <Menu className="w-4 h-4 text-neutral-500" />
                        <span>More & Profile</span>
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
      )}

      {/* Mobile Bottom Navigation Bar with Circular Buffer Spinner on Tab Switching */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-neutral-200/80 z-40 sm:hidden flex items-center justify-around py-2 px-3 shadow-lg">
        <Link
          href="/"
          onClick={() => handleNavClick("/")}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            {pendingPath === "/" ? (
              <div className="w-4 h-4 rounded-full border-2 border-emerald-100 border-t-[#0c831f] border-r-[#0c831f] animate-spin" />
            ) : (
              <Home className="w-5 h-5" />
            )}
          </div>
          <span>Home</span>
        </Link>
        <Link
          href="/user/print"
          onClick={() => handleNavClick("/user/print")}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/user/print" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            {pendingPath === "/user/print" ? (
              <div className="w-4 h-4 rounded-full border-2 border-emerald-100 border-t-[#0c831f] border-r-[#0c831f] animate-spin" />
            ) : (
              <Printer className="w-5 h-5" />
            )}
          </div>
          <span>Print</span>
        </Link>
        {user && (
          <Link
            href="/user/history"
            onClick={() => handleNavClick("/user/history")}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
              pathname === "/user/history" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              {pendingPath === "/user/history" ? (
                <div className="w-4 h-4 rounded-full border-2 border-emerald-100 border-t-[#0c831f] border-r-[#0c831f] animate-spin" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <span>Jobs</span>
          </Link>
        )}
        <Link
          href="/user/more"
          onClick={() => handleNavClick("/user/more")}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/user/more" ? "text-[#0c831f] font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            {pendingPath === "/user/more" ? (
              <div className="w-4 h-4 rounded-full border-2 border-emerald-100 border-t-[#0c831f] border-r-[#0c831f] animate-spin" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </div>
          <span>More</span>
        </Link>
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            onClick={() => handleNavClick("/admin/dashboard")}
            className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-rose-600"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              {pendingPath === "/admin/dashboard" ? (
                <div className="w-4 h-4 rounded-full border-2 border-rose-200 border-t-rose-600 animate-spin" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <span>Admin</span>
          </Link>
        )}
      </nav>

      {/* Centered Buffer Loading Overlay using Arc with NO background box */}
      {pendingPath && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none transition-all duration-150 animate-in fade-in">
          <div className="text-[#0c831f] drop-shadow-md">
            <Arc className="size-14" />
          </div>
        </div>
      )}

    </>
  );
}
