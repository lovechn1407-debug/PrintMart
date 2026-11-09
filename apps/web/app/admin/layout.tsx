"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Button,
  Chip,
  Divider,
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
  ArrowLeft,
  ShieldCheck,
  Tv,
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Vending Machines", href: "/admin/machines", icon: Printer },
  { label: "Kiosk Ads & Media", href: "/admin/ads", icon: Tv },
  { label: "Pricing Management", href: "/admin/pricing", icon: Coins },
  { label: "Offers & Referrals", href: "/admin/offers", icon: TicketPercent },
  { label: "Users & Accounts", href: "/admin/users", icon: Users },
  { label: "Print Jobs", href: "/admin/jobs", icon: FileSpreadsheet },
  { label: "Transactions", href: "/admin/transactions", icon: Receipt },
  { label: "Error Monitoring", href: "/admin/errors", icon: AlertTriangle },
  { label: "Remote Overlays", href: "/admin/overlays", icon: MonitorPlay },
  { label: "System Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-500">
        Loading Admin Portal...
      </div>
    );
  }

  // If not admin, provide access gate or demo grant
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShieldCheck className="w-12 h-12 text-primary mb-3" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Admin Authentication Required</h2>
          <p className="text-sm text-neutral-500 mb-4 max-w-md">
            Please sign in with your administrative Google account to manage vending machines and pricing.
          </p>
          <Button color="primary" onPress={() => signInWithGoogle()}>
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <AppNavbar />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 py-6 gap-6">
        {/* Admin Sidebar Navigation */}
        <aside className="w-full md:w-64 flex flex-col gap-1 shrink-0">
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl mb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Control Plane
              </span>
              <span className="text-sm font-bold text-neutral-900">Master Admin</span>
            </div>
            <Chip size="sm" color="danger" variant="flat">
              Superadmin
            </Chip>
          </div>

          <nav className="flex flex-col gap-1 bg-white border border-neutral-200/80 rounded-xl p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Admin Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

