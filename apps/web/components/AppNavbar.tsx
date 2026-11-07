"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Avatar,
  Chip,
} from "@heroui/react";
import { Printer, User, LogOut, ShieldAlert, Home, Clock } from "lucide-react";
import { useAuth } from "@/lib/authContext";

export function AppNavbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signInWithGoogle, signOut, loading } = useAuth();

  return (
    <>
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <Navbar isBordered={false} maxWidth="xl" className="px-4 sm:px-6 h-14 sm:h-16">
          <NavbarBrand>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary tracking-tight">
              <div className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span>PrintMart</span>
            </Link>
            <Chip size="sm" variant="flat" color="primary" className="ml-2.5 text-xs hidden sm:inline-flex">
              Campus Kiosk
            </Chip>
          </NavbarBrand>

          {/* Desktop Navigation Links */}
          <NavbarContent className="hidden sm:flex gap-6" justify="center">
            <NavbarItem isActive={pathname === "/"}>
              <Link
                href="/"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/" ? "text-primary font-bold" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Home
              </Link>
            </NavbarItem>
            <NavbarItem isActive={pathname === "/user/print"}>
              <Link
                href="/user/print"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/user/print" ? "text-primary font-bold" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Start Printing
              </Link>
            </NavbarItem>
            {user && (
              <NavbarItem isActive={pathname === "/user/history"}>
                <Link
                  href="/user/history"
                  className={`text-sm font-medium transition-colors ${
                    pathname === "/user/history" ? "text-primary font-bold" : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  My Print Jobs
                </Link>
              </NavbarItem>
            )}
            {isAdmin && (
              <NavbarItem isActive={pathname.startsWith("/admin")}>
                <Link
                  href="/admin/dashboard"
                  className="text-sm font-semibold flex items-center gap-1 text-danger"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Admin Portal
                </Link>
              </NavbarItem>
            )}
          </NavbarContent>

          {/* Auth / Profile */}
          <NavbarContent justify="end">
            {loading ? (
              <NavbarItem>
                <Button size="sm" variant="light" isLoading>
                  Loading
                </Button>
              </NavbarItem>
            ) : user ? (
              <NavbarItem className="flex items-center gap-2 sm:gap-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-semibold text-neutral-900 truncate max-w-[150px]">
                    {profile?.displayName || user.displayName}
                  </span>
                  <span className="text-xs text-neutral-500 truncate max-w-[150px]">{user.email}</span>
                </div>
                <Avatar
                  src={profile?.photoURL || user.photoURL || undefined}
                  name={user.displayName || "User"}
                  size="sm"
                  className="shrink-0"
                />
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={() => signOut()}
                  className="px-2 sm:px-3 text-xs"
                  startContent={<LogOut className="w-3.5 h-3.5" />}
                >
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </NavbarItem>
            ) : (
              <NavbarItem>
                <Button
                  size="sm"
                  color="primary"
                  variant="solid"
                  onPress={() => signInWithGoogle()}
                  startContent={<User className="w-4 h-4" />}
                  className="text-xs sm:text-sm font-semibold"
                >
                  Sign In
                </Button>
              </NavbarItem>
            )}
          </NavbarContent>
        </Navbar>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed for quick native app-like phone UX) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-neutral-200/80 z-40 sm:hidden flex items-center justify-around py-2 px-3 shadow-lg">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/" ? "text-primary font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/user/print"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            pathname === "/user/print" ? "text-primary font-bold" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Printer className="w-5 h-5" />
          <span>Print</span>
        </Link>
        {user && (
          <Link
            href="/user/history"
            className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
              pathname === "/user/history" ? "text-primary font-bold" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Jobs</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-danger"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
