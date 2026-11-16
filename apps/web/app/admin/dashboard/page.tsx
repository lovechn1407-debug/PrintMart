"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import {
  Printer,
  Coins,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  MapPin,
  Plus,
  Tv,
  MonitorPlay,
  Copy,
  Check,
} from "lucide-react";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, MachineRecord, PrintJob } from "@printmart/shared";

export default function AdminDashboardPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [printerStatuses, setPrinterStatuses] = useState<Record<string, any>>({});
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Listen to machines
    const machinesRef = ref(database, "machines");
    const unsubMachines = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          machineId: val.machineId || key,
        }));
        setMachines(list);
      } else {
        setMachines([]);
      }
    });

    // Listen to printer telemetry
    const printerRef = ref(database, "machinePrinterStatus");
    const unsubPrinter = onValue(printerRef, (snap) => {
      if (snap.exists()) {
        setPrinterStatuses(snap.val());
      }
    });

    // Listen to printJobs
    const jobsRef = ref(database, "printJobs");
    const unsubJobs = onValue(jobsRef, (snap) => {
      if (snap.exists()) {
        const allJobs = Object.values(snap.val()) as PrintJob[];
        setJobs(allJobs.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setJobs([]);
      }
    });

    return () => {
      unsubMachines();
      unsubPrinter();
      unsubJobs();
    };
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Aggregated Stats
  const onlineMachines = machines.filter((m) => m.status === "ONLINE").length;
  const offlineMachines = machines.filter((m) => m.status === "OFFLINE" || m.status === "DISABLED").length;

  const totalRevenuePaise = jobs.reduce((sum, j) => {
    return j.payment?.status === "PAID" ? sum + (j.pricing?.finalPayablePaise || 0) : sum;
  }, 0);

  const totalPagesPrinted = jobs.reduce((sum, j) => {
    return j.printing?.status === "COMPLETED" ? sum + (j.printing.printedPages || 0) : sum;
  }, 0);

  const completedJobs = jobs.filter((j) => j.printing?.status === "COMPLETED").length;
  const activePrintingJobs = jobs.filter((j) => j.printing?.status === "PRINTING").length;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* ── Top Header & Quick Actions ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Fleet Operations Dashboard
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Realtime monitoring of campus kiosks, print spoolers, and settled revenue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/overlays"
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200/80 shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-amber-600" />
            <span>Overlays</span>
          </Link>

          <Link
            href="/admin/machines"
            className="px-3.5 py-1.5 rounded-xl bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Machines</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kiosks */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Vending Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">{machines.length}</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {onlineMachines} Online
              </span>
              {offlineMachines > 0 && (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {offlineMachines} Attention
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Gross Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">
              {formatRupees(totalRevenuePaise)}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1">Verified payment settlements</p>
          </div>
        </div>

        {/* Total Print Jobs */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Print Jobs
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">{jobs.length}</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {completedJobs} Printed
              </span>
              {activePrintingJobs > 0 && (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {activePrintingJobs} Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total Pages Printed */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Pages
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-neutral-900">{totalPagesPrinted}</span>
            <p className="text-[11px] text-neutral-400 mt-1">Dispensed across all kiosks</p>
          </div>
        </div>
      </div>

      {/* ── Vending Machines Fleet Table ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-900">Vending Machines Fleet</h3>
            <p className="text-xs text-neutral-500">Live hardware status, login pair codes, and connectivity</p>
          </div>
          <Link
            href="/admin/machines"
            className="text-xs font-bold text-[#0c831f] hover:text-[#0a6e1a] flex items-center gap-1"
          >
            <span>View All ({machines.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Machine Name & ID</th>
                <th className="py-3 px-4">Campus Location</th>
                <th className="py-3 px-4">Pair Code (Login)</th>
                <th className="py-3 px-4">Startup Auto-Pair</th>
                <th className="py-3 px-4">Kiosk Status</th>
                <th className="py-3 px-4">Printer Telemetry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {machines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 text-xs">
                    No vending machines registered yet. Click &quot;Manage Machines&quot; to add one.
                  </td>
                </tr>
              ) : (
                machines.slice(0, 6).map((m) => {
                  const printer = printerStatuses[m.machineId];
                  const pairCode = m.pairCode || "123456";
                  const isAutoPair = m.autoPairEnabled !== false;
                  return (
                    <tr key={m.machineId} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 text-xs sm:text-sm">{m.name}</span>
                          <span className="font-mono text-[11px] text-neutral-400">{m.machineId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {m.location || "Campus Ground Floor"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-emerald-50 text-[#0c831f] px-2 py-0.5 rounded-lg border border-emerald-200">
                            {pairCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(pairCode)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer border-0"
                            title="Copy Pair Code"
                          >
                            {copiedCode === pairCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAutoPair
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isAutoPair ? "Auto-Pair ON" : "Pair Every Startup"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === "ONLINE"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.status === "DISABLED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.status || "ONLINE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {printer ? (
                          <div className="flex flex-col text-[11px]">
                            <span className="font-semibold text-neutral-800">
                              {printer.printerName || "Kiosk Spooler"}
                            </span>
                            <span className="text-neutral-400">
                              State: <strong className="text-emerald-700 font-bold">{printer.printerState || "READY"}</strong> • Paper: {printer.paperPercentage ? `${printer.paperPercentage}%` : "OK"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">Ready</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href="/admin/machines"
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Print Activity Table ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-900">Recent Print Activity</h3>
            <p className="text-xs text-neutral-500">Latest customer print jobs and preloads across the network</p>
          </div>
          <Link
            href="/admin/jobs"
            className="text-xs font-bold text-[#0c831f] hover:text-[#0a6e1a] flex items-center gap-1"
          >
            <span>View All Jobs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Target Kiosk</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Preload Status</th>
                <th className="py-3 px-4">Hardware Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                    No print jobs logged yet.
                  </td>
                </tr>
              ) : (
                jobs.slice(0, 5).map((j) => (
                  <tr key={j.jobId} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-xs text-neutral-900">{j.jobId}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-800 truncate max-w-xs">
                      {j.documentName}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      {j.machineId}
                    </td>
                    <td className="py-3 px-4 font-bold text-neutral-900">
                      {formatRupees(j.pricing?.finalPayablePaise || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          j.preparation?.status === "READY"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : j.preparation?.status === "PRELOAD_FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {j.preparation?.status || "CREATED"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          j.printing?.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {j.printing?.status || "QUEUED"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
