"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Search,
  Eye,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { ref, onValue, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, PrintJob } from "@printmart/shared";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snap) => {
      if (snap.exists()) {
        const all = Object.values(snap.val()) as PrintJob[];
        setJobs(all.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setJobs([]);
      }
    });

    return () => unsub();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      (j.jobId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.documentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.machineId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.orderId || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "COMPLETED") return j.printing?.status === "COMPLETED";
    if (statusFilter === "PRINTING") return j.printing?.status === "PRINTING";
    if (statusFilter === "FAILED") return j.preparation?.status === "PRELOAD_FAILED" || j.printing?.status === "FAILED";
    return true;
  });

  const retryPreload = async (jobId: string) => {
    await update(ref(database, `printJobs/${jobId}/preparation`), {
      status: "PRELOAD_QUEUED",
      preloadStartedAt: Date.now(),
      errorMessage: null,
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Print Jobs Fleet Tracker
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor background document preloads, hardware spooler status, and OTP verification records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-700 bg-white border border-neutral-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            {jobs.length} Total Jobs
          </span>
        </div>
      </div>

      {/* ── Filter Bar & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Job ID, Order ID, document name, or machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white rounded-xl border border-neutral-200/80 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 text-xs font-medium text-neutral-900 outline-none shadow-2xs transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-1 p-1 bg-neutral-200/70 rounded-xl shrink-0 self-start sm:self-auto">
          {["ALL", "COMPLETED", "PRINTING", "FAILED"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                statusFilter === tab
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {tab === "ALL" ? "All Jobs" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Jobs Table ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Job ID & Time</th>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Pages & Copies</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Preload Status</th>
                <th className="py-3 px-4">Print Status</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400 text-xs">
                    No print jobs match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.jobId} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-neutral-900">{job.jobId}</span>
                        <span className="text-[11px] text-neutral-400">
                          {job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : "—"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 truncate max-w-xs block">
                          {job.documentName}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Order: <code className="font-mono">{job.orderId}</code>
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-neutral-700">
                      {job.machineId}
                    </td>

                    <td className="py-3 px-4 text-neutral-700 font-semibold">
                      {job.configuration?.totalPagesToPrint || 1}p × {job.configuration?.copies || 1}c
                    </td>

                    <td className="py-3 px-4 font-bold text-neutral-900">
                      {formatRupees(job.pricing?.finalPayablePaise || 0)}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          job.preparation?.status === "READY"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : job.preparation?.status === "PRELOAD_FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {job.preparation?.status || "CREATED"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          job.printing?.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : job.printing?.status === "PRINTING"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {job.printing?.status || "QUEUED"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer border-0"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {job.preparation?.status === "PRELOAD_FAILED" && (
                          <button
                            type="button"
                            onClick={() => retryPreload(job.jobId)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border-0"
                            title="Retry Preload"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Job Details Modal ── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-0 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Print Job Audit Record</h3>
                <span className="font-mono text-xs text-neutral-400">{selectedJob.jobId}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-neutral-400 hover:text-neutral-600 font-bold text-sm cursor-pointer border-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Document Name:</span>
                  <span className="font-bold text-neutral-900">{selectedJob.documentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Order ID:</span>
                  <span className="font-mono font-bold text-neutral-800">{selectedJob.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Target Vending Kiosk:</span>
                  <span className="font-mono font-bold text-neutral-800">{selectedJob.machineId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">OTP Consumed:</span>
                  <span
                    className={`font-bold ${
                      selectedJob.otpConsumed ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {selectedJob.otpConsumed ? "YES (Dispensed)" : "NO (Awaiting Dispense)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Cashfree Payment Status:</span>
                  <span className="font-bold text-emerald-700">{selectedJob.payment?.status || "PAID"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Total Payable:</span>
                  <span className="font-bold text-neutral-900">
                    {formatRupees(selectedJob.pricing?.finalPayablePaise || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Spooler Hardware Job ID:</span>
                  <span className="font-mono text-neutral-700">
                    {selectedJob.printing?.spoolerJobId || "Not Spooled Yet"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold cursor-pointer border-0"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
