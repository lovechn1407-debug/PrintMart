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
import { Printer, User, LogOut, ShieldAlert, FileText, Home, Clock } from "lucide-react";
import { useAuth } from "@/lib/authContext";

export function AppNavbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signInWithGoogle, signOut, loading } = useAuth();

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <Navbar isBordered={false} maxWidth="xl" className="px-3 sm:px-6">
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary tracking-tight">
            <div className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span>PrintMart</span>
          </Link>
          <Chip size="sm" variant="flat" color="primary" className="ml-2 text-xs hidden xs:inline-flex">
            Smart Kiosk
          </Chip>
        </NavbarBrand>

        {/* Desktop Navigation Links */}
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
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
                className="px-2 sm:px-3 text-xs sm:text-sm"
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
                className="text-xs sm:text-sm"
              >
                Sign In
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>
      </Navbar>

      {/* Mobile Navigation Strip (Under Header on Phones) */}
      <nav className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-neutral-50 border-t border-neutral-100 sm:hidden scrollbar-none">
        <Link
          href="/"
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            pathname === "/" ? "bg-primary text-white font-bold" : "bg-white text-neutral-700 border border-neutral-200"
          }`}
        >
          <Home className="w-3 h-3" />
          Home
        </Link>
        <Link
          href="/user/print"
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            pathname === "/user/print" ? "bg-primary text-white font-bold" : "bg-white text-neutral-700 border border-neutral-200"
          }`}
        >
          <Printer className="w-3 h-3" />
          Start Printing
        </Link>
        {user && (
          <Link
            href="/user/history"
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              pathname === "/user/history" ? "bg-primary text-white font-bold" : "bg-white text-neutral-700 border border-neutral-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            My Jobs
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-red-50 text-danger border border-red-200"
          >
            <ShieldAlert className="w-3 h-3" />
            Admin
          </Link>
        )}
      </nav>
    </div>
  );
}
