"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Printer,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Plus,
  FileText,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, PrintJob } from "@printmart/shared";

type FilterTab = "all" | "active" | "completed";

export default function UserHistoryPage() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [copiedJobOtp, setCopiedJobOtp] = useState<string | null>(null);
  const [copiedReceiptOtp, setCopiedReceiptOtp] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allJobs = Object.values(snapshot.val()) as PrintJob[];
        const userJobs = allJobs
          .filter((j) => j.userId === user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setJobs(userJobs);
      } else {
        setJobs([]);
      }
    });

    return () => unsub();
  }, [user]);

  const copyJobOtp = (otp: string) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedJobOtp(otp);
    setTimeout(() => {
      setCopiedJobOtp(null);
    }, 2000);
  };

  const copyReceiptOtp = (otp: string) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedReceiptOtp(true);
    setTimeout(() => {
      setCopiedReceiptOtp(false);
    }, 2000);
  };

  // Status helper
  const isJobActive = (job: PrintJob) => {
    const isPaid = job.payment?.status === "PAID";
    const notConsumed = !job.otpConsumed;
    const notExpired = job.otpExpiresAt ? Date.now() < job.otpExpiresAt : true;
    const notCompleted = job.printing?.status !== "COMPLETED";
    return isPaid && notConsumed && notExpired && notCompleted;
  };

  const isJobExpired = (job: PrintJob) => {
    return !job.otpConsumed && job.otpExpiresAt ? Date.now() >= job.otpExpiresAt : false;
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (activeTab === "active") {
      return jobs.filter((j) => isJobActive(j));
    }
    if (activeTab === "completed") {
      return jobs.filter((j) => j.printing?.status === "COMPLETED" || j.otpConsumed);
    }
    return jobs;
  }, [jobs, activeTab]);

  const activeCount = useMemo(() => jobs.filter(isJobActive).length, [jobs]);
  const completedCount = useMemo(
    () => jobs.filter((j) => j.printing?.status === "COMPLETED" || j.otpConsumed).length,
    [jobs]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fbf9f3]">
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-neutral-500">Loading your print jobs...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 pb-20 relative overflow-x-hidden">
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-100/70 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-4 shadow-2xs">
            <Printer className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#1c1c1c] mb-1.5 tracking-tight">
            Sign in to view print jobs
          </h2>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            Access your active kiosk release OTPs, view past receipts, and track document printing in real-time.
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full h-11 bg-neutral-950 hover:bg-neutral-800 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 pb-28 relative overflow-x-hidden">
      <AppNavbar />

      {/* ─────────────────────────────────────────────────────────────
          TOP AURA & FINE GUILLOCHÉ WAVY CONTOUR TEXTURE
          Matches homepage & print studio aesthetic
          ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 h-96 pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#fde047]/40 via-[#fef08a]/15 to-transparent" />
        <svg
          className="absolute -top-6 -left-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
          viewBox="0 0 320 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`left-arc-${i}`}
              d={`M -20 ${20 + i * 16} C 120 ${10 + i * 16}, 210 ${90 + i * 16}, 260 ${240 + i * 16}`}
              stroke="currentColor"
              strokeWidth="0.85"
              strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
            />
          ))}
        </svg>
        <svg
          className="absolute -top-6 -right-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
          viewBox="0 0 320 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`right-arc-${i}`}
              d={`M 340 ${20 + i * 16} C 200 ${10 + i * 16}, 110 ${90 + i * 16}, 60 ${240 + i * 16}`}
              stroke="currentColor"
              strokeWidth="0.85"
              strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
            />
          ))}
        </svg>
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-44 bg-radial from-[#fde68a]/30 via-transparent to-transparent blur-xl" />
      </div>

      {/* Main Container - Prioritizing View for Phone First */}
      <main className="flex-1 w-full max-w-md sm:max-w-xl mx-auto px-3.5 sm:px-4 z-10 relative pt-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between pt-3 pb-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/user/print"
              className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-700 hover:text-neutral-950 active:scale-95 transition-all"
              aria-label="Back to Print Studio"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight leading-tight">
                My Print Jobs
              </h1>
              <p className="text-[11px] sm:text-xs text-[#5c6874] mt-0.5 font-normal">
                Active kiosk codes & print receipts
              </p>
            </div>
          </div>
          <Link
            href="/user/print?new=1"
            className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Print</span>
          </Link>
        </div>

        {/* Segmented Filter Bar */}
        <div className="bg-neutral-200/60 backdrop-blur-xs p-1 rounded-xl flex items-center gap-1 my-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all text-center ${
              activeTab === "all"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === "active"
                ? "bg-white text-[#0c831f] shadow-2xs font-bold"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {activeCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#0c831f] animate-ping" />
            )}
            <span>Active OTPs ({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all text-center ${
              activeTab === "completed"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Empty State */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-center my-4 flex flex-col items-center">
            {/* Layered Document Graphic from Homepage */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center select-none pointer-events-none mb-3">
              <div className="absolute w-16 h-20 bg-white border border-slate-200 rounded-sm shadow-xs -rotate-12 -translate-x-3 p-1.5 flex flex-col justify-between">
                <div className="w-4 h-4 rounded-full bg-cyan-100 flex items-center justify-center text-[6px] text-cyan-700 font-bold">
                  DOC
                </div>
                <div className="space-y-1">
                  <div className="h-1 bg-slate-200 rounded w-full" />
                  <div className="h-1 bg-slate-200 rounded w-4/5" />
                </div>
              </div>
              <div className="absolute w-18 h-22 bg-white border border-slate-200/90 rounded-sm shadow-md rotate-2 p-2 flex flex-col z-10">
                <div className="bg-[#0c831f] text-white font-bold text-[7px] px-1.5 py-0.5 rounded-xs tracking-wider mb-2 flex items-center justify-between">
                  <span>PRINT</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-1 bg-slate-300 rounded w-full" />
                  <div className="h-1 bg-slate-200 rounded w-4/5" />
                  <div className="h-1 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            </div>

            <h3 className="text-base font-bold text-[#1c1c1c] mb-1">
              {activeTab === "active"
                ? "No active print OTPs"
                : activeTab === "completed"
                ? "No completed jobs yet"
                : "No print jobs yet"}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mb-5">
              {activeTab === "active"
                ? "When you order prints, your 6-digit universal OTP will appear here for easy kiosk access."
                : "Upload your document to print instantly at any campus kiosk."}
            </p>
            <Link
              href="/user/print?new=1"
              className="h-10 px-5 rounded-lg bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Upload & Print Now</span>
            </Link>
          </div>
        ) : (
          /* Phone-First Cards Stack */
          <div className="space-y-3.5 my-3">
            {filteredJobs.map((job) => {
              const active = isJobActive(job);
              const expired = isJobExpired(job);
              const isPaid = job.payment?.status === "PAID";
              const isPrinting = job.printing?.status === "PRINTING";
              const isCompleted = job.printing?.status === "COMPLETED" || job.otpConsumed;

              // Multiple documents detection
              const isMulti =
                (job.documents && job.documents.length > 1) ||
                (job.documentCount && job.documentCount > 1) ||
                (job.documentName && job.documentName.includes("more files"));

              const displayDocTitle = isMulti
                ? `${job.documents?.length || job.documentCount || (job.documentName.match(/\+(\d+) more/) ? parseInt(RegExp.$1) + 1 : 2)} Documents`
                : job.documentName || "Document.pdf";

              return (
                <div
                  key={job.jobId}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all flex flex-col gap-3"
                >
                  {/* Card Header: File icon, Document Name & Moved "Print Again" Link */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200/70 flex items-center justify-center shrink-0 text-neutral-700">
                        <FileText className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-[#1c1c1c] truncate leading-tight">
                          {displayDocTitle}
                        </h4>
                        <span className="text-[11px] text-neutral-400 mt-0.5 block">
                          {new Date(job.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Moved "Print Again" to the capsule area (Capsules and dots removed) */}
                    <Link
                      href="/user/print?new=1"
                      className="shrink-0 text-xs font-semibold text-[#0c831f] hover:text-[#0a6e1a] bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                    >
                      <span>Print Again</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      OTP DISPLAY BLOCK (SHOWN IN THE PRINT JOB)
                      Universal campus text removed, helper line removed
                      ───────────────────────────────────────────────────────────── */}
                  {job.otp ? (
                    active ? (
                      /* ACTIVE OTP BLOCK */
                      <div className="bg-[#eefaf0] rounded-lg p-3 flex items-center justify-between">
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-[0.2em] shimmer-otp-text">
                          {job.otp}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyJobOtp(job.otp!)}
                          className="h-8 px-3 rounded-md bg-white border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 flex items-center gap-1.5 transition-all"
                        >
                          {copiedJobOtp === job.otp ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy OTP</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : isCompleted ? (
                      /* COMPLETED OTP ROW */
                      <div className="bg-neutral-50 rounded-lg py-2 px-3 flex items-center justify-between text-xs text-neutral-600">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 font-semibold">
                            OTP: {job.otp}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dispensed at {job.machineId || "Campus Kiosk"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyJobOtp(job.otp!)}
                          className="text-[11px] text-neutral-500 hover:text-neutral-900 underline"
                        >
                          {copiedJobOtp === job.otp ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ) : expired ? (
                      /* EXPIRED OTP ROW */
                      <div className="bg-neutral-50 rounded-lg py-2 px-3 flex items-center justify-between text-xs text-neutral-500">
                        <span className="font-mono text-neutral-400">OTP: {job.otp}</span>
                        <span className="text-rose-600 font-medium">Expired (TTL 60 min)</span>
                      </div>
                    ) : (
                      /* PENDING PAYMENT */
                      <div className="bg-amber-50/70 rounded-lg py-2 px-3 flex items-center justify-between text-xs text-amber-800">
                        <span>Awaiting payment confirmation</span>
                      </div>
                    )
                  ) : (
                    /* Fallback when OTP is not assigned */
                    <div className="bg-neutral-50 rounded-lg py-2 px-3 flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-mono text-xs">Job ID: {job.jobId}</span>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      MOVED "VIEW RECEIPT" IN PLACE OF "B&W.1COPY.1PG"
                      Clean line with "View Receipt" and Total Payable Price
                      ───────────────────────────────────────────────────────────── */}
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 flex items-center gap-1 transition-colors"
                    >
                      <span>View Receipt</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                    <span className="text-sm font-bold text-[#0c831f]">
                      {formatRupees(job.pricing?.finalPayablePaise || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            JOB RECEIPT BOTTOM SHEET (PHONE FIRST MODAL)
            Styled with warm homepage / print studio aesthetic
            ───────────────────────────────────────────────────────────── */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setSelectedJob(null)}
            />

            {/* Bottom-to-Up Receipt Sheet (Edge-to-Edge on mobile) */}
            <div className="relative w-full sm:max-w-md bg-white rounded-t-[26px] sm:rounded-2xl border-t sm:border border-neutral-200/90 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] p-5 pb-8 sm:p-6 sm:pb-6 z-10 animate-in slide-in-from-bottom duration-300 ease-out max-h-[85vh] overflow-y-auto">
              {/* Drag notch indicator */}
              <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Receipt Header */}
              <div className="text-center pt-1 pb-3 border-b border-neutral-100">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#0c831f] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#1c1c1c] tracking-tight">
                  Print Job Receipt
                </h3>
                <span className="font-mono text-[11px] text-neutral-400 block mt-0.5">
                  {selectedJob.jobId}
                </span>
              </div>

              {/* Receipt OTP Highlight if available */}
              {selectedJob.otp && (
                <div className="my-3 py-3 px-4 bg-[#eefaf0] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                      Universal Release Code
                    </span>
                    <span className="text-2xl font-black font-mono tracking-widest text-[#0c831f]">
                      {selectedJob.otp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyReceiptOtp(selectedJob.otp!)}
                    className="h-8 px-3 rounded-md bg-white border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 flex items-center gap-1 transition-all"
                  >
                    {copiedReceiptOtp ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Specs Breakdown */}
              <div className="space-y-2 py-3 text-xs border-b border-neutral-100">
                {selectedJob.documents && selectedJob.documents.length > 1 ? (
                  <div className="py-1">
                    <span className="text-neutral-500 font-semibold block mb-1.5">
                      Documents ({selectedJob.documents.length})
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedJob.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-neutral-50 border border-neutral-100"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="font-medium text-neutral-800 truncate">
                              {doc.documentName}
                            </span>
                          </div>
                          <span className="text-neutral-500 text-[11px] shrink-0 ml-2">
                            {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Document</span>
                    <span className="font-semibold text-neutral-900 truncate max-w-[200px]">
                      {selectedJob.documentName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Color Mode</span>
                  <span className="font-medium text-neutral-800 capitalize">
                    {selectedJob.configuration?.colorMode === "color"
                      ? "Full Color"
                      : "Black & White"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Print Sides</span>
                  <span className="font-medium text-neutral-800 capitalize">
                    {selectedJob.configuration?.simplexDuplex === "duplex"
                      ? "Double-Sided (Duplex)"
                      : "Single-Sided (Simplex)"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Copies & Pages</span>
                  <span className="font-medium text-neutral-800">
                    {selectedJob.configuration?.totalPagesToPrint || 1} pages ×{" "}
                    {selectedJob.configuration?.copies || 1} copies
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Paper Size</span>
                  <span className="font-medium text-neutral-800">
                    {selectedJob.configuration?.paperSize || "A4"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Kiosk Station</span>
                  <span className="font-semibold text-emerald-700">
                    {selectedJob.machineId === "UNIVERSAL"
                      ? "Any Campus Kiosk"
                      : selectedJob.machineId}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Payment Status</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedJob.payment?.status || "PAID"}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="py-3 space-y-1.5 text-xs border-b border-neutral-100">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatRupees(selectedJob.pricing?.subtotalPaise || 0)}</span>
                </div>
                {(selectedJob.pricing?.discountPaise || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatRupees(selectedJob.pricing?.discountPaise || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#1c1c1c] pt-1">
                  <span>Total Paid</span>
                  <span className="text-[#0c831f]">
                    {formatRupees(selectedJob.pricing?.finalPayablePaise || 0)}
                  </span>
                </div>
              </div>

              {/* How to use points */}
              <div className="bg-[#fbf9f3] rounded-xl p-3 my-3 border border-amber-200/40 text-left">
                <ul className="space-y-1 text-xs text-neutral-600">
                  <li className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">✦</span>
                    <span>Valid at <strong>any campus kiosk</strong> touchscreen</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">✦</span>
                    <span>Tap "Enter OTP" and type your 6-digit code</span>
                  </li>
                </ul>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-full h-11 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 font-semibold rounded-xl text-xs transition-all"
              >
                Close Receipt
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
