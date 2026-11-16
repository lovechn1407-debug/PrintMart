"use client";

import React, { useEffect, useState } from "react";
import {
  Receipt,
  Search,
  Coins,
  Copy,
  Check,
  CreditCard,
  CheckCircle2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, PrintJob } from "@printmart/shared";

export default function AdminTransactionsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snap) => {
      if (snap.exists()) {
        const all = Object.values(snap.val()) as PrintJob[];
        setJobs(
          all
            .filter((j) => j.payment?.status === "PAID")
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      } else {
        setJobs([]);
      }
    });

    return () => unsub();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    return (
      (j.orderId || "").toLowerCase().includes(q) ||
      (j.payment?.cfPaymentId || "").toLowerCase().includes(q) ||
      (j.userId || "").toLowerCase().includes(q) ||
      (j.machineId || "").toLowerCase().includes(q)
    );
  });

  const totalSettled = jobs.reduce(
    (sum, j) => sum + (j.pricing?.finalPayablePaise || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Transactions & Settlements
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Verified gateway payment records, order references, and automated Cashfree settlement logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-700 bg-white border border-neutral-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            {jobs.length} Verified Payments
          </span>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Total Settled Volume
            </span>
            <span className="text-2xl font-black text-neutral-900">{formatRupees(totalSettled)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Settlement Gateway
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-neutral-800">Cashfree PG v2</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active / Verified
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by Order ID, Cashfree Payment ID, or User UID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-white rounded-2xl border border-neutral-200/80 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 text-xs font-medium text-neutral-900 outline-none shadow-2xs transition-all"
        />
      </div>

      {/* ── Transactions Table ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Payment Reference</th>
                <th className="py-3 px-4">Customer UID</th>
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Settled Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                    No payment records match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((j) => {
                  const payId = j.payment?.cfPaymentId || "DEMO_SANDBOX";
                  return (
                    <tr key={j.orderId} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-neutral-900">
                            {j.orderId}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {j.createdAt ? new Date(j.createdAt).toLocaleString() : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                            {payId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(payId)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer border-0"
                            title="Copy Payment ID"
                          >
                            {copiedId === payId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 truncate max-w-xs">
                        {j.userId}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-neutral-700">
                        {j.jobId}
                      </td>

                      <td className="py-3 px-4 font-bold text-xs sm:text-sm text-neutral-900">
                        {formatRupees(j.pricing?.finalPayablePaise || 0)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Verified Paid
                        </span>
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
