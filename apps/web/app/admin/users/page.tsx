"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Mail,
  UserCheck,
  UserX,
  Shield,
  FileText,
  Coins,
} from "lucide-react";
import { ref, onValue, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, UserProfile } from "@printmart/shared";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const usersRef = ref(database, "users");
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([uid, val]: [string, any]) => ({
          ...val,
          uid: val.uid || uid,
          accountStatus: val.accountStatus || "active",
          role: val.role || "customer",
        }));
        setUsers(list);
      } else {
        setUsers([]);
      }
    });

    return () => unsub();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.uid || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAccountStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await update(ref(database, `users/${uid}`), { accountStatus: newStatus });
  };

  const toggleUserRole = async (uid: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "customer" : "admin";
    await update(ref(database, `users/${uid}`), { role: newRole });
  };

  const toggleVerifiedBadge = async (uid: string, currentStatus?: boolean) => {
    await update(ref(database, `users/${uid}`), { isVerified: !currentStatus });
  };

  // Stats
  const activeCount = users.filter((u) => u.accountStatus === "active").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const totalSpent = users.reduce((sum, u) => sum + (u.stats?.totalSpentPaise || 0), 0);

  return (
    <div className="flex flex-col gap-6 max-w-6xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            User Accounts & Roles
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage customer accounts, grant administrative access, and audit lifetime spending.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-700 bg-white border border-neutral-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            {users.length} Registered Accounts
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Active Customers
            </span>
            <span className="text-2xl font-black text-neutral-900">{activeCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Admin Operators
            </span>
            <span className="text-2xl font-black text-neutral-900">{adminCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Total Customer Volume
            </span>
            <span className="text-2xl font-black text-neutral-900">{formatRupees(totalSpent)}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by customer name, email address, or user UID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-white rounded-2xl border border-neutral-200/80 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 text-xs font-medium text-neutral-900 outline-none shadow-2xs transition-all"
        />
      </div>

      {/* ── Users Table ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">User Profile</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Documents</th>
                <th className="py-3 px-4">Pages Printed</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4">Member Since</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400 text-xs">
                    No customer accounts match your search query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.accountStatus === "active";
                  const isAdminRole = u.role === "admin";
                  const photo = u.photoURL;
                  const initials = (u.displayName || u.email || "U").charAt(0).toUpperCase();

                  return (
                    <tr key={u.uid} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {photo ? (
                            <img
                              src={photo}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#0c831f] font-bold flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-900 text-xs sm:text-sm">
                                {u.displayName || "Anonymous User"}
                              </span>
                              {u.isVerified && (
                                <span title="Verified Campus Creator" className="inline-flex items-center shrink-0">
                                  <img
                                    src="/brand/verified-badge.webp"
                                    alt="Verified"
                                    className="w-4 h-4 object-contain shrink-0 inline-block align-middle"
                                  />
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-neutral-400" />
                              {u.email || "No email linked"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isAdminRole
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                          }`}
                        >
                          {isAdminRole ? "Administrator" : "Customer"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isActive ? "Active" : "Suspended"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-700 font-semibold">
                        {u.stats?.totalDocuments || 0}
                      </td>

                      <td className="py-3 px-4 text-neutral-700 font-semibold">
                        {u.stats?.totalPages || 0} pages
                      </td>

                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {formatRupees(u.stats?.totalSpentPaise || 0)}
                      </td>

                      <td className="py-3 px-4 text-neutral-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Recent"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Verified Badge */}
                          <button
                            type="button"
                            onClick={() => toggleVerifiedBadge(u.uid, u.isVerified)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                              u.isVerified
                                ? "bg-emerald-50 text-[#0c831f] border-emerald-200 hover:bg-emerald-100"
                                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200"
                            }`}
                            title={u.isVerified ? "Revoke Verified Badge" : "Assign Verified Badge"}
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#0c831f]" />
                            <span>{u.isVerified ? "Verified" : "Verify"}</span>
                          </button>

                          {/* Toggle Admin Role */}
                          <button
                            type="button"
                            onClick={() => toggleUserRole(u.uid, u.role)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors cursor-pointer border-0"
                            title={isAdminRole ? "Revoke Admin access" : "Promote to Admin"}
                          >
                            {isAdminRole ? "Demote" : "Make Admin"}
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            type="button"
                            onClick={() => toggleAccountStatus(u.uid, u.accountStatus)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border-0 ${
                              isActive
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {isActive ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
