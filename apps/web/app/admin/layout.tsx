"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Button,
  Chip,
  Avatar,
} from "@heroui/react";
import {
  LayoutDashboard,
  Printer,
  Coins,
  TicketPercent,
  Users,
  FileSpreadsheet,
  Receipt,
  AlertTriangle,
  MonitorPlay,
  Settings,
  ShieldCheck,
  Tv,
  ExternalLink,
  LogOut,
  Radio,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { database, ref, onValue } from "@/lib/firebase";

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "FLEET & HARDWARE",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Vending Machines", href: "/admin/machines", icon: Printer },
      { label: "Kiosk Ads & Media", href: "/admin/ads", icon: Tv },
      { label: "Remote Overlays", href: "/admin/overlays", icon: MonitorPlay },
      { label: "Error Monitoring", href: "/admin/errors", icon: AlertTriangle },
    ],
  },
  {
    title: "PRICING & COMMERCE",
    items: [
      { label: "Pricing Management", href: "/admin/pricing", icon: Coins },
      { label: "Offers & Coupons", href: "/admin/offers", icon: TicketPercent },
      { label: "Print Jobs", href: "/admin/jobs", icon: FileSpreadsheet },
      { label: "Transactions", href: "/admin/transactions", icon: Receipt },
    ],
  },
  {
    title: "SYSTEM & ACCESS",
    items: [
      { label: "Users & Accounts", href: "/admin/users", icon: Users },
      { label: "System Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, isAdmin, loading, signInWithGoogle, signOut } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Monitor fleet status for the header
  useEffect(() => {
    const machinesRef = ref(database, "machines");
    const unsub = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as any[];
        setTotalCount(list.length);
        setOnlineCount(list.filter((m) => m.status === "ONLINE").length);
      } else {
        setTotalCount(0);
        setOnlineCount(0);
      }
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf7ee] text-neutral-800 font-sans">
        <div className="w-9 h-9 border-3 border-[#0c831f] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-neutral-600 tracking-wider uppercase">
          Loading Admin Control Plane...
        </span>
      </div>
    );
  }

  // Admin authentication gate
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#faf7ee] text-neutral-900 font-sans">
        <header className="h-16 px-6 bg-white border-b border-neutral-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <img src="/brand/printmart-logo.webp" alt="PrintMart" className="h-7 w-auto object-contain" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-900 text-white px-2 py-0.5 rounded-full">
              Admin Portal
            </span>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5"
          >
            <span>Customer Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#0c831f] flex items-center justify-center mb-4 shadow-xs border border-emerald-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
            Administrator Authentication Required
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6 max-w-md leading-relaxed">
            Please sign in with your authorized administrative account to configure vending machines, pricing, and system policies.
          </p>
          <Button
            size="md"
            className="bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold text-sm px-6 h-11 rounded-xl shadow-xs"
            onPress={() => signInWithGoogle()}
          >
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  const rawPhoto = profile?.photoURL || user?.photoURL;
  const userInitials = (profile?.displayName || user?.displayName || user?.email || "A")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-neutral-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── Executive Top Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200/90 h-15 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        {/* Left: Brand & Admin Console Identifier */}
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <img src="/brand/printmart-logo.webp" alt="PrintMart" className="h-7 w-auto object-contain" />
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-950 text-white px-2 py-0.5 rounded-full shadow-2xs">
              Control Plane
            </span>
          </Link>

          {/* Realtime Fleet Status Pill */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-neutral-200 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-neutral-700">
              Fleet: <strong className="text-emerald-700 font-bold">{onlineCount} Online</strong> of {totalCount} Kiosks
            </span>
          </div>
        </div>

        {/* Right: Quick Launch & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Launch Kiosk Screen */}
          <Link
            href="/kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-all border border-neutral-200/70"
            title="Open customer kiosk terminal in full screen"
          >
            <Monitor className="w-3.5 h-3.5 text-[#0c831f]" />
            <span>Launch Kiosk</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>

          {/* Customer Store Link */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-medium transition-colors"
          >
            <span>Customer Store</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>

          {/* Admin User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
            <Avatar
              src={rawPhoto || undefined}
              name={userInitials}
              size="sm"
              className="w-7 h-7 text-xs font-bold bg-[#0c831f] text-white"
            />
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-neutral-900 leading-tight truncate max-w-[140px]">
                {profile?.displayName || user.displayName || "Admin User"}
              </span>
              <span className="text-[10px] text-neutral-500 leading-tight">Master Superadmin</span>
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border-0 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout: Sidebar Navigation + Workspace ── */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 py-5 sm:py-6 gap-6">
        {/* ── Sidebar Navigation ── */}
        <aside className="w-full md:w-60 lg:w-64 flex flex-col gap-4 shrink-0">
          <nav className="flex flex-col gap-4 bg-white border border-neutral-200/80 rounded-2xl p-3 shadow-2xs">
            {navSections.map((section) => (
              <div key={section.title} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase px-2.5 py-1">
                  {section.title}
                </span>

                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#0c831f] text-white shadow-xs"
                            : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-neutral-500"}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Admin Content Workspace ── */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
